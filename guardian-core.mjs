import { createHash, randomUUID } from 'node:crypto';

export const CANONICAL_PORTALS = Object.freeze([
  'Creativity',
  'Work',
  'Home',
  'Well-being',
  'Relationships',
  'Events',
  'Style'
]);

export const PORTAL_ALIASES = Object.freeze({
  wellbeing: 'Well-being',
  'well-being': 'Well-being',
  community: 'Events',
  events: 'Events'
});

const PORTAL_KEYS = Object.freeze({
  creativity: 'Creativity',
  work: 'Work',
  home: 'Home',
  relationships: 'Relationships',
  style: 'Style'
});

export function resolvePortal(value) {
  const key = String(value || '').trim().toLowerCase().replace(/[\s_]+/g, '-');
  if (PORTAL_ALIASES[key]) return { canonical: PORTAL_ALIASES[key], alias: key };
  if (PORTAL_KEYS[key]) return { canonical: PORTAL_KEYS[key], alias: null };
  return null;
}

export function portalContract() {
  return CANONICAL_PORTALS.map((name) => ({
    name,
    aliases: name === 'Events' ? ['Community'] : name === 'Well-being' ? ['Wellbeing'] : [],
    migration: name === 'Events' || name === 'Well-being' ? 'backward-compatible-alias' : 'stable'
  }));
}

const EXTERNAL_ACTIONS = new Set([
  'send_message', 'publish', 'book', 'purchase', 'device_change', 'delete', 'share', 'memory_export'
]);

export function classifyAction(action) {
  const normalized = String(action || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (EXTERNAL_ACTIONS.has(normalized)) return { action: normalized, external: true, severity: 'high' };
  if (['write_draft', 'prepare', 'preview', 'recommend', 'read', 'simulate'].includes(normalized)) {
    return { action: normalized, external: false, severity: 'low' };
  }
  return { action: normalized || 'unknown', external: true, severity: 'critical' };
}

function digest(previous, event) {
  return createHash('sha256').update(`${previous}:${JSON.stringify(event)}`).digest('hex');
}

export class AuditLedger {
  #events = [];
  #previous = 'GENESIS';
  #maxEntries;

  constructor({ maxEntries = 500 } = {}) { this.#maxEntries = maxEntries; }

  append(event) {
    const body = { id: randomUUID(), at: new Date().toISOString(), ...event };
    const entry = { ...body, previous: this.#previous, hash: digest(this.#previous, body) };
    this.#previous = entry.hash;
    this.#events.push(entry);
    if (this.#events.length > this.#maxEntries) this.#events.shift();
    return entry;
  }

  list() { return this.#events.map((entry) => ({ ...entry })); }

  verify() {
    let previous = 'GENESIS';
    for (const entry of this.#events) {
      const { hash, previous: entryPrevious, ...body } = entry;
      if (entryPrevious !== previous || hash !== digest(previous, body)) return false;
      previous = hash;
    }
    return true;
  }
}

export class SafetyController {
  #locked = false;
  #ledger;

  constructor({ ledger = new AuditLedger() } = {}) { this.#ledger = ledger; }

  get locked() { return this.#locked; }
  get ledger() { return this.#ledger; }

  lockdown({ actor = 'owner' } = {}) {
    this.#locked = true;
    return this.#ledger.append({ type: 'LOCKDOWN', actor, result: 'LOCKED' });
  }

  restore({ actor = 'owner' } = {}) {
    this.#locked = false;
    return this.#ledger.append({ type: 'RESTORE', actor, result: 'RESTORED' });
  }

  authorize({ action, approval = false, ownerAuthenticated = false, actor = 'unknown', metadata = {} } = {}) {
    const classified = classifyAction(action);
    let result = 'ALLOWED_PREPARE';
    let reason = 'Prepared locally; no external side effect was performed.';
    if (this.#locked) {
      result = 'DENIED_LOCKDOWN';
      reason = 'Guardian lockdown is active; only inspection is available.';
    } else if (classified.external && (!approval || !ownerAuthenticated)) {
      result = 'DENIED_APPROVAL';
      reason = 'Explicit owner approval and authenticated owner context are required.';
    }
    const entry = this.#ledger.append({
      type: 'ACTION_AUTHORIZATION', actor, action: classified.action,
      severity: classified.severity, approval: Boolean(approval),
      ownerAuthenticated: Boolean(ownerAuthenticated), result, metadata
    });
    return { allowed: result === 'ALLOWED_PREPARE', executed: false, result, reason, auditId: entry.id, ...classified };
  }
}

export class CompletionContract {
  #tasks = new Map();
  #ledger;

  constructor({ ledger = new AuditLedger() } = {}) { this.#ledger = ledger; }

  create({ title, criteria = [], owner = 'owner' } = {}) {
    const task = { id: `task-${randomUUID()}`, title: String(title || '').trim().slice(0, 240), criteria: [...new Set(criteria.map(String))], evidence: [], status: 'PLANNED', owner };
    if (!task.title) throw new Error('Task title is required');
    this.#tasks.set(task.id, task);
    this.#ledger.append({ type: 'TASK_CREATED', taskId: task.id, status: task.status });
    return { ...task, criteria: [...task.criteria], evidence: [] };
  }

  addEvidence({ taskId, evidence } = {}) {
    const task = this.#tasks.get(taskId);
    if (!task) throw new Error('Task not found');
    const item = String(evidence || '').trim().slice(0, 1000);
    if (!item) throw new Error('Evidence is required');
    task.evidence.push(item);
    task.status = 'IMPLEMENTED_UNVERIFIED';
    this.#ledger.append({ type: 'TASK_EVIDENCE_ADDED', taskId, status: task.status });
    return { ...task, criteria: [...task.criteria], evidence: [...task.evidence] };
  }

  verify({ taskId } = {}) {
    const task = this.#tasks.get(taskId);
    if (!task) throw new Error('Task not found');
    task.status = task.evidence.length > 0 && task.criteria.length > 0 ? 'VERIFIED' : 'BLOCKED';
    this.#ledger.append({ type: 'TASK_VERIFIED', taskId, status: task.status });
    return { ...task, criteria: [...task.criteria], evidence: [...task.evidence] };
  }

  accept({ taskId, approved = false } = {}) {
    const task = this.#tasks.get(taskId);
    if (!task) throw new Error('Task not found');
    if (task.status !== 'VERIFIED' || !approved) throw new Error('Only a verified task with explicit owner approval can be accepted');
    task.status = 'USER_ACCEPTED';
    this.#ledger.append({ type: 'TASK_ACCEPTED', taskId, status: task.status });
    return { ...task, criteria: [...task.criteria], evidence: [...task.evidence] };
  }

  get(taskId) {
    const task = this.#tasks.get(taskId);
    return task ? { ...task, criteria: [...task.criteria], evidence: [...task.evidence] } : null;
  }
}

export const guardianLedger = new AuditLedger();
export const guardianSafety = new SafetyController({ ledger: guardianLedger });
export const guardianCompletion = new CompletionContract({ ledger: guardianLedger });
