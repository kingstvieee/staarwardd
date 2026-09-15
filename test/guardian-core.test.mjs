import test from 'node:test';
import assert from 'node:assert/strict';
import { createGuardianCore } from '../guardian/core.mjs';

class FixedClock extends Date {
  constructor(){ super('2026-09-15T02:46:00.000Z'); }
  static now(){ return new Date('2026-09-15T02:46:00.000Z').valueOf(); }
}

test('Guardian restores all three proof-of-life missions and prioritizes Hub Core', () => {
  const guardian=createGuardianCore({clock:FixedClock,timezone:'America/Toronto'});
  const briefing=guardian.briefing();
  assert.equal(briefing.activeCount,3);
  assert.equal(briefing.priority.id,'hub-core-build');
  assert.deepEqual(briefing.missions.map(m=>m.id),['hub-core-build','puppy-search','rsf-fabric-sourcing']);
});

test('Guardian exposes trusted Toronto temporal context', () => {
  const guardian=createGuardianCore({clock:FixedClock,timezone:'America/Toronto'});
  const temporal=guardian.temporalContext();
  assert.equal(temporal.now,'2026-09-15T02:46:00.000Z');
  assert.equal(temporal.timezone,'America/Toronto');
  assert.match(temporal.local,/September 14, 2026/);
});

test('planned work cannot be marked completed without verified evidence state', () => {
  const guardian=createGuardianCore({clock:FixedClock});
  assert.throws(()=>guardian.updateMission('hub-core-build',{status:'completed'}),/VERIFIED_COMPLETE/);
  const completed=guardian.updateMission('hub-core-build',{status:'completed',currentState:'Registry verified.'},{ledgerState:'VERIFIED_COMPLETE',summary:'Registry test passed.',evidence:{test:'guardian-core'}});
  assert.equal(completed.status,'completed');
  assert.ok(completed.lastVerifiedUpdate);
  assert.equal(guardian.getLedger().at(-1).state,'VERIFIED_COMPLETE');
});

test('private mode is stateful and auditable', () => {
  const guardian=createGuardianCore({clock:FixedClock});
  guardian.setPrivateMode(true);
  assert.equal(guardian.briefing().privateMode,true);
  assert.match(guardian.getLedger().at(-1).summary,/Private Mode enabled/);
});

test('portal views share the same mission brain', () => {
  const guardian=createGuardianCore({clock:FixedClock});
  assert.equal(guardian.listMissions({portal:'Work'}).some(m=>m.id==='hub-core-build'),true);
  assert.equal(guardian.listMissions({portal:'Style'}).some(m=>m.id==='rsf-fabric-sourcing'),true);
  assert.equal(guardian.listMissions({portal:'Home'}).some(m=>m.id==='puppy-search'),true);
});
