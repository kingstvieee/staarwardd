import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { PersistentAuditStore } from './guardian-persistence.mjs';
import { permissionDecision, POLICY_VERSION } from './guardian-policy.mjs';
import { TrustKernel } from './guardian-trust-kernel.mjs';
import { GuardianLoopEngine } from './guardian-loop-engine.mjs';

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

export function isOwnerTokenValid(authorization, expected = process.env.STAARWAARDD_OWNER_TOKEN) {
  if (!expected || typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) return false;
  const supplied = Buffer.from(authorization.slice(7));
  const configured = Buffer.from(expected);
  return supplied.length === configured.length && timingSafeEqual(supplied, configured);
}

export function portalContract() {
  return CANONICAL_PORTALS.map((name) => ({
    name,
    aliases: name === 'Events' ? ['Community'] : name === 'Well-being' ? ['Wellbeing'] : [],
    migration: name === 'Events' || name === 'Well-being' ? 'backward-compatible-alias' : 'stable'
  }));
}

const PORTAL_INTEGRATIONS = Object.freeze({
  Creativity: ['draft_asset', 'review_rights', 'prepare_release'],
  Work: ['prepare_brief', 'summarize_context', 'draft_update'],
  Home: ['prepare_routine', 'inspect_local_state'],
  'Well-being': ['private_check_in', 'prepare_recovery_routine'],
  Relationships: ['draft_message', 'prepare_commitment'],
  Events: ['compare_options', 'prepare_registration'],
  Style: ['prepare_look', 'review_wardrobe']
});

export function portalIntegrationContract() {
  return CANONICAL_PORTALS.map((name) => ({
    name,
    aliases: portalContract().find((portal) => portal.name === name)?.aliases || [],
    providerStatus: 'NOT_CONNECTED',
    executionMode: 'PREPARE_ONLY',
    approvalRequired: true,
    capabilities: [...PORTAL_INTEGRATIONS[name]]
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
  #store;

  constructor({ maxEntries = 500, store = null } = {}) {
    this.#maxEntries = maxEntries;
    this.#store = store;
    if (store) {
      this.#events = store.load();
      if (!this.verify()) throw new Error('Persistent audit chain failed integrity verification');
      this.#previous = this.#events.at(-1)?.hash || 'GENESIS';
    }
  }

  append(event) {
    const body = { id: randomUUID(), at: new Date().toISOString(), ...event };
    const entry = { ...body, previous: this.#previous, hash: digest(this.#previous, body) };
    this.#previous = entry.hash;
    this.#events.push(entry);
    if (this.#store) this.#store.append(entry);
    return entry;
  }

  list() { return this.#events.slice(-this.#maxEntries).map((entry) => ({ ...entry })); }

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
    const policy = permissionDecision({ action: classified.action, approval, ownerAuthenticated, locked: this.#locked });
    const result = policy.result === 'ALLOW_PREPARE' ? 'ALLOWED_PREPARE' : policy.result.replace('DENY_', 'DENIED_');
    const reason = result === 'ALLOWED_PREPARE'
      ? 'Prepared locally; no external side effect was performed.'
      : result === 'DENIED_LOCKDOWN'
        ? 'Guardian lockdown is active; only inspection is available.'
        : 'Explicit owner approval and authenticated owner context are required.';
    const entry = this.#ledger.append({
      type: 'ACTION_AUTHORIZATION', actor, action: classified.action,
      severity: policy.level, policyVersion: POLICY_VERSION, approval: Boolean(approval),
      ownerAuthenticated: Boolean(ownerAuthenticated), result, metadata
    });
    return { allowed: result === 'ALLOWED_PREPARE', executed: false, result, reason, auditId: entry.id, policy, ...classified };
  }
}

export class CompletionContract {
  #tasks = new Map();
  #ledger;

  constructor({ ledger = new AuditLedger() } = {}) {
    this.#ledger = ledger;
    for (const event of ledger.list()) {
      if (event.type === 'TASK_CREATED' && event.task) this.#tasks.set(event.task.id, { ...event.task, criteria: [...event.task.criteria], evidence: [...event.task.evidence] });
      if (event.type === 'TASK_EVIDENCE_ADDED' && this.#tasks.has(event.taskId)) { this.#tasks.get(event.taskId).evidence.push(event.evidence); this.#tasks.get(event.taskId).status = event.status; }
      if (event.type === 'TASK_VERIFIED' && this.#tasks.has(event.taskId)) this.#tasks.get(event.taskId).status = event.status;
      if (event.type === 'TASK_ACCEPTED' && this.#tasks.has(event.taskId)) this.#tasks.get(event.taskId).status = event.status;
    }
  }

  create({ title, criteria = [], owner = 'owner' } = {}) {
    const task = { id: `task-${randomUUID()}`, title: String(title || '').trim().slice(0, 240), criteria: [...new Set(criteria.map(String))], evidence: [], status: 'PLANNED', owner };
    if (!task.title) throw new Error('Task title is required');
    this.#tasks.set(task.id, task);
    this.#ledger.append({ type: 'TASK_CREATED', taskId: task.id, status: task.status, task: { ...task, criteria: [...task.criteria], evidence: [] } });
    return { ...task, criteria: [...task.criteria], evidence: [] };
  }

  addEvidence({ taskId, evidence } = {}) {
    const task = this.#tasks.get(taskId);
    if (!task) throw new Error('Task not found');
    const item = String(evidence || '').trim().slice(0, 1000);
    if (!item) throw new Error('Evidence is required');
    task.evidence.push(item);
    task.status = 'IMPLEMENTED_UNVERIFIED';
    this.#ledger.append({ type: 'TASK_EVIDENCE_ADDED', taskId, status: task.status, evidence: item });
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

export const guardianLedger = new AuditLedger({ store: new PersistentAuditStore() });
export const guardianSafety = new SafetyController({ ledger: guardianLedger });
export const guardianCompletion = new CompletionContract({ ledger: guardianLedger });
export const guardianTrustKernel = new TrustKernel({ audit: guardianLedger });
export const guardianLoopEngine = new GuardianLoopEngine({ kernel: guardianTrustKernel, audit: guardianLedger });
