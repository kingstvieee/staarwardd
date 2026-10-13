import { randomUUID } from 'node:crypto';

export const LOOP_STATES = Object.freeze([
  'planned', 'running', 'completed_verified', 'blocked_permission', 'blocked_risk',
  'failed_verification', 'escalated_human', 'stopped_safe_mode', 'timed_out', 'retry_exhausted'
]);

export class GuardianLoopEngine {
  #kernel;
  #audit;
  #runs = new Map();

  constructor({ kernel, audit = null } = {}) {
    if (!kernel) throw new Error('Trust Kernel is required');
    this.#kernel = kernel;
    this.#audit = audit;
  }

  create({ objective, trigger = 'user', skill, criteria = [], retryLimit = 0, timeoutMs = 30000, lanes = 1 } = {}) {
    if (!objective || !skill || !criteria.length) throw new Error('objective, skill, and completion criteria are required');
    if (!Number.isInteger(retryLimit) || retryLimit < 0 || retryLimit > 5) throw new Error('retryLimit must be between 0 and 5');
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 300000) throw new Error('timeoutMs must be finite and bounded');
    if (!Number.isInteger(lanes) || lanes < 1 || lanes > 4) throw new Error('lanes must be between 1 and 4');
    const run = {
      loopRunId: `loop-${randomUUID()}`,
      objective: String(objective).slice(0, 240), trigger: String(trigger),
      skill: { id: String(skill.id || skill), version: String(skill.version || '1.0.0') },
      criteria: [...new Set(criteria.map(String))], retryLimit, timeoutMs,
      lanes: Array.from({ length: lanes }, (_, index) => ({ laneId: `lane-${randomUUID()}`, index, state: 'idle', ownReceipts: [] })),
      retriesUsed: 0, state: 'planned', simulated: true, verifier: 'independent-deterministic'
    };
    this.#runs.set(run.loopRunId, run);
    this.#audit?.append({ type: 'LOOP_CREATED', loopRunId: run.loopRunId, skill: run.skill, criteria: run.criteria, retryLimit, timeoutMs, laneCount: lanes });
    return this.get(run.loopRunId);
  }

  run({ loopRunId, laneId, actions = [], observed = {}, verification = {} } = {}) {
    const run = this.#runs.get(loopRunId);
    if (!run) throw new Error('Loop not found');
    const lane = run.lanes.find((candidate) => candidate.laneId === laneId);
    if (!lane) throw new Error('Lane not found');
    run.state = 'running'; lane.state = 'running';
    const decisions = [];
    for (const action of actions) {
      const decision = this.#kernel.authorize(action);
      decisions.push(decision);
      lane.ownReceipts.push(decision.auditId);
      if (!decision.allowed) {
        run.state = decision.result === 'DENIED_SAFE_MODE' ? 'stopped_safe_mode' : decision.result === 'DENIED_RISK' ? 'blocked_risk' : 'blocked_permission';
        lane.state = 'blocked';
        this.#audit?.append({ type: 'LOOP_BLOCKED', loopRunId, laneId, result: run.state, decision: decision.result });
        return this.get(loopRunId);
      }
    }
    const verificationResult = this.verify({ loopRunId, observed, verification });
    if (!verificationResult.verified) {
      run.state = run.retriesUsed < run.retryLimit ? 'running' : 'failed_verification';
      run.retriesUsed += run.state === 'running' ? 1 : 0;
      lane.state = run.state === 'running' ? 'repair_required' : 'failed';
      this.#audit?.append({ type: 'LOOP_VERIFICATION_FAILED', loopRunId, laneId, failedCriteria: verificationResult.failedCriteria, retriesUsed: run.retriesUsed });
      return this.get(loopRunId);
    }
    run.state = 'completed_verified'; lane.state = 'completed';
    this.#audit?.append({ type: 'LOOP_COMPLETED_VERIFIED', loopRunId, laneId, simulated: true });
    return this.get(loopRunId);
  }

  verify({ loopRunId, observed = {}, verification = {} } = {}) {
    const run = this.#runs.get(loopRunId);
    if (!run) throw new Error('Loop not found');
    const failedCriteria = run.criteria.filter((criterion) => verification[criterion] !== true || observed[criterion] === undefined);
    return { verified: failedCriteria.length === 0, failedCriteria };
  }

  stop(loopRunId, reason = 'user_stop') {
    const run = this.#runs.get(loopRunId);
    if (!run) return null;
    run.state = reason === 'safe_mode' ? 'stopped_safe_mode' : 'escalated_human';
    run.lanes.forEach((lane) => { if (lane.state === 'running' || lane.state === 'idle') lane.state = 'stopped'; });
    this.#audit?.append({ type: 'LOOP_STOPPED', loopRunId, reason, finalState: run.state });
    return this.get(loopRunId);
  }

  get(loopRunId) {
    const run = this.#runs.get(loopRunId);
    return run ? structuredClone(run) : null;
  }

  list() { return [...this.#runs.values()].map((run) => this.get(run.loopRunId)); }
}
