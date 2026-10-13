import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GuardianModelRouter } from '../guardian-model-router.mjs';
import { GuardianProviderAdapterRegistry, createOpenAIResponsesAdapter } from '../guardian-provider-adapters.mjs';
import { GuardianProviderOrchestrator } from '../guardian-provider-orchestrator.mjs';
import { GuardianObservability } from '../guardian-observability.mjs';
import { GuardianSignedShutdownAuthority } from '../guardian-signed-shutdown.mjs';
import { GuardianIsolatedActionExecutor } from '../guardian-isolated-action-executor.mjs';
import { GuardianMissionEngine } from '../guardian-mission-engine.mjs';
import { GuardianMissionStore } from '../guardian-mission-store.mjs';
import { GuardianRemoteAuditSink } from '../guardian-remote-audit.mjs';

function fakeJsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

test('OpenAI Responses adapter normalizes provider output without exposing raw HTML sinks', async () => {
  const adapter = createOpenAIResponsesAdapter({
    apiKey: 'test-key', modelId: 'test-model',
    fetchImpl: async () => fakeJsonResponse({ id: 'resp_1', status: 'completed', output_text: '<b>safe text</b>' })
  });
  const result = await adapter.execute({ input: 'hello' });
  assert.equal(result.providerId, 'openai');
  assert.equal(result.modelId, 'test-model');
  assert.equal(result.rendering.innerHTMLAllowed, false);
  assert.match(result.text, /safe text/);
});

test('provider orchestrator fails over from a broken provider to a healthy one', async () => {
  const router = new GuardianModelRouter();
  router.register({ providerId: 'broken', modelId: 'b1', capabilities: ['general'], costTier: 1, latencyTier: 1, metadata: { qualityTier: 4 } });
  router.register({ providerId: 'healthy', modelId: 'h1', capabilities: ['general'], costTier: 2, latencyTier: 2, metadata: { qualityTier: 4 } });
  const registry = new GuardianProviderAdapterRegistry();
  registry.register({ providerId: 'broken', modelId: 'b1', endpoint: 'local://broken', configured: true, async execute() { throw new Error('provider down'); } });
  registry.register({ providerId: 'healthy', modelId: 'h1', endpoint: 'local://healthy', configured: true, async execute() { return { providerId: 'healthy', modelId: 'h1', text: 'ok' }; } });
  const orchestrator = new GuardianProviderOrchestrator({ router, registry });
  const result = await orchestrator.execute({ input: 'test', maxAttempts: 2 });
  assert.equal(result.selected.providerId, 'healthy');
  assert.equal(result.failoverUsed, true);
  assert.equal(result.attempts.length, 2);
});

test('signed shutdown blocks isolated actions until a signed restore is applied', async () => {
  const authority = new GuardianSignedShutdownAuthority({ secret: 'x'.repeat(40) });
  const executor = new GuardianIsolatedActionExecutor({
    isLockedDown: () => authority.state === 'LOCKDOWN',
    authorize: () => ({ allowed: true })
  });
  executor.registerAdapter({ adapterId: 'test', capabilities: ['run'], async execute() { return { ok: true }; } });
  const lock = authority.issue({ operation: 'LOCKDOWN' });
  assert.equal(authority.apply(lock).state, 'LOCKDOWN');
  const denied = await executor.request({ adapterId: 'test', capability: 'run', approval: true, ownerAuthenticated: true, dryRun: false });
  assert.equal(denied.reason, 'GUARDIAN_LOCKDOWN_ACTIVE');
  const restore = authority.issue({ operation: 'RESTORE' });
  assert.equal(authority.apply(restore).state, 'ACTIVE');
  const allowed = await executor.request({ adapterId: 'test', capability: 'run', approval: true, ownerAuthenticated: true, dryRun: false });
  assert.equal(allowed.executed, true);
});

test('Mission state survives an engine restart through the durable Mission store', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'guardian-mission-'));
  try {
    const store = new GuardianMissionStore({ filePath: join(dir, 'missions.json') });
    const first = new GuardianMissionEngine();
    const mission = first.create({ title: 'Persist me', objective: 'Survive restart', criteria: ['Proof'] });
    first.start(mission.id);
    await store.save(first.list());
    const second = new GuardianMissionEngine();
    second.importState(await store.load(), { replace: true });
    assert.equal(second.get(mission.id).status, 'IN_PROGRESS');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('remote audit signs and flushes a queued batch only when configured', async () => {
  let captured = null;
  const sink = new GuardianRemoteAuditSink({
    endpoint: 'https://audit.invalid/events',
    secret: 's'.repeat(40),
    fetchImpl: async (url, options) => { captured = { url, options }; return new Response('{}', { status: 200 }); }
  });
  assert.equal(sink.enqueue({ type: 'TEST' }).queued, true);
  const result = await sink.flush();
  assert.equal(result.flushed, 1);
  assert.equal(captured.url, 'https://audit.invalid/events');
  assert.ok(captured.options.headers['X-STAARWAARDD-Audit-Signature']);
});

test('observability excludes prompt and secret fields', () => {
  const metrics = new GuardianObservability();
  metrics.event('test', { provider: 'openai', prompt: 'private prompt', apiKey: 'secret', ok: true });
  const event = metrics.snapshot().recentEvents[0];
  assert.equal(event.provider, 'openai');
  assert.equal(event.ok, true);
  assert.equal(event.prompt, undefined);
  assert.equal(event.apiKey, undefined);
});
