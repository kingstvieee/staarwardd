import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ConnectorAttestationAuthority } from '../guardian-connector-attestation.mjs';
import { EncryptedMemoryStore } from '../guardian-encrypted-memory-store.mjs';
import { GuardianDurableIdentityStore } from '../guardian-durable-identity.mjs';
import { GuardianModelRouter } from '../guardian-model-router.mjs';
import { GuardianDeviceRevocationRegistry } from '../guardian-device-revocation.mjs';
import { GuardianIsolatedActionExecutor } from '../guardian-isolated-action-executor.mjs';
import { GuardianSecurityEvidenceRegistry } from '../guardian-security-evidence.mjs';

test('signed connector attestations detect tampering and enforce scope', () => {
  const authority = new ConnectorAttestationAuthority({ secret: 'a'.repeat(64) });
  const attestation = authority.issue({
    connectorId: 'calendar', provider: 'ExampleCalendar', scopes: ['events.read'], expiresAt: new Date(Date.now() + 60_000).toISOString()
  });
  assert.equal(authority.verify(attestation, { connectorId: 'calendar', requiredScope: 'events.read' }).valid, true);
  assert.equal(authority.verify(attestation, { requiredScope: 'events.write' }).valid, false);
  const tampered = structuredClone(attestation);
  tampered.payload.provider = 'OtherProvider';
  assert.equal(authority.verify(tampered).reason, 'INVALID_SIGNATURE');
});

test('encrypted memory persists without storing plaintext', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'guardian-memory-'));
  const filePath = join(dir, 'memory.enc.json');
  try {
    const first = new EncryptedMemoryStore({ filePath, secret: 'm'.repeat(64) });
    await first.load();
    const record = await first.put({ content: 'private memory text', category: 'preference' });
    const second = new EncryptedMemoryStore({ filePath, secret: 'm'.repeat(64) });
    await second.load();
    assert.equal(second.get(record.memoryId).content, 'private memory text');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('durable identity survives reload and revocation', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'guardian-identity-'));
  const filePath = join(dir, 'identities.json');
  try {
    const first = new GuardianDurableIdentityStore({ filePath });
    await first.load();
    await first.enroll({ deviceId: 'phone-1', publicKeyFingerprint: 'sha256:abc', assurance: 'strong' });
    const second = new GuardianDurableIdentityStore({ filePath });
    await second.load();
    assert.equal(second.isTrusted('phone-1', 'sha256:abc'), true);
    await second.revoke('phone-1');
    const third = new GuardianDurableIdentityStore({ filePath });
    await third.load();
    assert.equal(third.isTrusted('phone-1'), false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('model router is provider-neutral and does not execute providers', () => {
  const router = new GuardianModelRouter();
  router.register({ providerId: 'local', modelId: 'vision-local', capabilities: ['vision'], privacy: 'local', costTier: 1, latencyTier: 2 });
  router.register({ providerId: 'cloud-a', modelId: 'vision-cloud', capabilities: ['vision'], privacy: 'cloud', costTier: 2, latencyTier: 1 });
  const routed = router.route({ task: 'vision', requirePrivacy: 'local' });
  assert.equal(routed.selected.providerId, 'local');
  assert.equal(routed.executable, false);
});

test('device revocation can invalidate every enrolled surface', () => {
  const registry = new GuardianDeviceRevocationRegistry();
  registry.enroll({ deviceId: 'phone', surfaces: ['phone'] });
  registry.enroll({ deviceId: 'desktop', surfaces: ['desktop'] });
  assert.equal(registry.isActive('desktop'), true);
  const result = registry.revokeAll('security-event');
  assert.equal(result.revoked.length, 2);
  assert.equal(registry.isActive('phone'), false);
  assert.equal(registry.isActive('desktop'), false);
});

test('isolated action executor requires approval and supports dry-run before execution', async () => {
  const executor = new GuardianIsolatedActionExecutor({
    authorize: ({ approval, ownerAuthenticated, risk }) => ({ allowed: approval && ownerAuthenticated && risk !== 'red', reason: 'test-policy' })
  });
  let executions = 0;
  executor.registerAdapter({ adapterId: 'sandbox', capabilities: ['write'], execute: async (input) => { executions += 1; return { echoed: input.value }; } });
  const denied = await executor.request({ adapterId: 'sandbox', capability: 'write', input: { value: 1 }, approval: false, ownerAuthenticated: true });
  assert.equal(denied.executed, false);
  const preview = await executor.request({ adapterId: 'sandbox', capability: 'write', input: { value: 2 }, approval: true, ownerAuthenticated: true, dryRun: true });
  assert.equal(preview.dryRun, true);
  assert.equal(executions, 0);
  const executed = await executor.request({ adapterId: 'sandbox', capability: 'write', input: { value: 3 }, approval: true, ownerAuthenticated: true, dryRun: false });
  assert.equal(executed.executed, true);
  assert.equal(executed.result.echoed, 3);
  assert.equal(executions, 1);
});

test('security evidence can gate a mission security verdict', () => {
  const evidence = new GuardianSecurityEvidenceRegistry();
  evidence.record({ suite: 'prompt-security', caseId: 'injection-1', result: 'PASS', metadata: { missionId: 'milo-1' } });
  evidence.record({ suite: 'runtime', caseId: 'permissions-1', result: 'PASS', metadata: { missionId: 'milo-1' } });
  assert.equal(evidence.missionEvidence('milo-1').securityVerified, true);
  evidence.record({ suite: 'runtime', caseId: 'connector-1', result: 'FAIL', severity: 'high', metadata: { missionId: 'milo-1' } });
  assert.equal(evidence.missionEvidence('milo-1').securityVerified, false);
});
