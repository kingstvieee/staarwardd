import test from 'node:test';
import assert from 'node:assert/strict';
import { GuardianMissionEngine, createMiloAcceptancePilot } from '../guardian-mission-engine.mjs';
import { adaptGuardianSurface, createPresenceProfile, GuardianPresenceRegistry } from '../guardian-presence-contract.mjs';

test('mission cannot be accepted before verification and owner approval', () => {
  const engine = new GuardianMissionEngine();
  const mission = engine.create({
    title: 'Test mission',
    objective: 'Prove completion contract behavior',
    criteria: [{ id: 'proof', text: 'Proof exists' }]
  });
  assert.throws(() => engine.accept(mission.id, { approved: true }), /VERIFIED/);
  engine.start(mission.id);
  const evidence = engine.addEvidence(mission.id, { description: 'Artifact produced', criterionIds: ['proof'] });
  assert.match(evidence.hash, /^[a-f0-9]{64}$/);
  engine.setCriterion(mission.id, 'proof', { state: 'PASSED' });
  assert.equal(engine.verify(mission.id).verified, true);
  assert.equal(engine.accept(mission.id, { approved: true }).status, 'USER_ACCEPTED');
});

test('unresolved blocker prevents mission verification', () => {
  const engine = new GuardianMissionEngine();
  const mission = engine.create({ title: 'Blocked', objective: 'Detect blocker', criteria: ['Requirement met'] });
  const blocker = engine.reportBlocker(mission.id, { reason: 'Provider unavailable', suggestedNextAction: 'Use approved fallback' });
  const verification = engine.verify(mission.id);
  assert.equal(verification.verified, false);
  assert.deepEqual(verification.unresolvedBlockers, [blocker.id]);
});

test('Milo pilot has explicit evidence-backed acceptance criteria', () => {
  const engine = new GuardianMissionEngine();
  const mission = createMiloAcceptancePilot(engine);
  assert.equal(mission.title, 'Milo Episode Completion Pilot');
  assert.ok(mission.criteria.length >= 10);
  assert.ok(mission.criteria.some((criterion) => criterion.id === 'sound-design'));
  assert.ok(mission.criteria.some((criterion) => criterion.id === 'owner-acceptance'));
});

test('presence is device-adaptive and sensors default to ask', () => {
  const phone = createPresenceProfile({ deviceId: 'phone-1', surface: 'phone', inputPreferences: ['voice', 'touch'] });
  const surface = adaptGuardianSurface(phone);
  assert.equal(surface.presentation.mode, 'compact-presence');
  assert.equal(surface.presentation.guardianVisible, true);
  assert.equal(surface.presentation.chatLogPrimary, false);
  assert.equal(surface.sensors.camera, 'ASK');
  assert.equal(surface.safety.ambientSurveillance, false);
});

test('assistive presence can expose accessibility-first controls without ambient surveillance', () => {
  const registry = new GuardianPresenceRegistry();
  registry.enroll({
    deviceId: 'assistive-1',
    surface: 'assistive',
    inputPreferences: ['voice', 'switch-control'],
    accessibilityNeeds: ['screen-reader', 'motor-access', 'reduced-motion']
  });
  const active = registry.activeSurfaces();
  assert.equal(active.length, 1);
  assert.equal(active[0].presentation.screenReaderOptimized, true);
  assert.equal(active[0].presentation.largeTargets, true);
  assert.equal(active[0].presentation.reducedMotion, true);
  assert.equal(active[0].safety.ambientSurveillance, false);
});
