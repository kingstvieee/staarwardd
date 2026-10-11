import test from 'node:test';
import assert from 'node:assert/strict';
import { AuditLedger, CompletionContract, SafetyController, isOwnerTokenValid, portalContract, resolvePortal } from '../guardian-core.mjs';

test('portal migration preserves Community and Wellbeing as backward-compatible aliases', () => {
  assert.deepEqual(resolvePortal('Community'), { canonical: 'Events', alias: 'community' });
  assert.deepEqual(resolvePortal('Wellbeing'), { canonical: 'Well-being', alias: 'wellbeing' });
  assert.deepEqual(portalContract().map((portal) => portal.name), ['Creativity', 'Work', 'Home', 'Well-being', 'Relationships', 'Events', 'Style']);
});

test('owner token validation is explicit and constant-time compatible', () => {
  assert.equal(isOwnerTokenValid('Bearer owner-secret', 'owner-secret'), true);
  assert.equal(isOwnerTokenValid('Bearer wrong', 'owner-secret'), false);
  assert.equal(isOwnerTokenValid('Bearer owner-secret', ''), false);
});

test('external actions are denied without explicit owner approval', () => {
  const ledger = new AuditLedger();
  const safety = new SafetyController({ ledger });
  const result = safety.authorize({ action: 'send_message', ownerAuthenticated: false, approval: false });
  assert.equal(result.allowed, false);
  assert.equal(result.executed, false);
  assert.equal(result.result, 'DENIED_APPROVAL');
  assert.equal(ledger.verify(), true);
});

test('lockdown denies even an otherwise approved external action and restore is auditable', () => {
  const ledger = new AuditLedger();
  const safety = new SafetyController({ ledger });
  safety.lockdown({ actor: 'owner' });
  const denied = safety.authorize({ action: 'device_change', ownerAuthenticated: true, approval: true });
  assert.equal(denied.result, 'DENIED_LOCKDOWN');
  safety.restore({ actor: 'owner' });
  const prepared = safety.authorize({ action: 'device_change', ownerAuthenticated: true, approval: true });
  assert.equal(prepared.result, 'ALLOWED_PREPARE');
  assert.equal(prepared.executed, false);
  assert.equal(ledger.verify(), true);
});

test('completion cannot be accepted before evidence-backed verification', () => {
  const ledger = new AuditLedger();
  const completion = new CompletionContract({ ledger });
  const task = completion.create({ title: 'Milo pilot acceptance', criteria: ['render verified', 'owner review'] });
  assert.equal(completion.verify({ taskId: task.id }).status, 'BLOCKED');
  assert.throws(() => completion.accept({ taskId: task.id, approved: true }), /verified task/);
  completion.addEvidence({ taskId: task.id, evidence: 'Deterministic render test passed.' });
  assert.equal(completion.verify({ taskId: task.id }).status, 'VERIFIED');
  assert.equal(completion.accept({ taskId: task.id, approved: true }).status, 'USER_ACCEPTED');
  assert.equal(ledger.verify(), true);
});
