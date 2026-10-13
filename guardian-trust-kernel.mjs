import { randomUUID } from 'node:crypto';

export const AUTONOMY_LEVELS = Object.freeze(['A0', 'A1', 'A2', 'A3', 'A4']);
export const RISK_LEVELS = Object.freeze(['green', 'yellow', 'orange', 'red']);

const autonomyRank = (level) => AUTONOMY_LEVELS.indexOf(level);
const riskRank = (risk) => RISK_LEVELS.indexOf(risk);

function containsRawCredential(value) {
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, item]) => {
    if (/credential|password|secret|private[_-]?key|access[_-]?token|api[_-]?key/i.test(key)) return true;
    if (item && typeof item === 'object') return containsRawCredential(item);
    return false;
  });
}

export class CapabilityGrant {
  constructor({ subject, resource, capability, autonomyLevel = 'A1', maxRisk = 'green', scope = {}, expiresAt = null, constraints = [] } = {}) {
    if (!subject || !resource || !capability) throw new Error('subject, resource, and capability are required');
    if (!AUTONOMY_LEVELS.includes(autonomyLevel)) throw new Error('Invalid autonomy level');
    if (!RISK_LEVELS.includes(maxRisk)) throw new Error('Invalid risk level');
    if (containsRawCredential(scope)) throw new Error('Raw credentials cannot enter a capability grant');
    this.grantId = `grant-${randomUUID()}`;
    this.subject = String(subject);
    this.resource = String(resource);
    this.capability = String(capability);
    this.scope = structuredClone(scope);
    this.autonomyLevel = autonomyLevel;
    this.maxRisk = maxRisk;
    this.expiresAt = expiresAt;
    this.createdAt = new Date().toISOString();
    this.revokedAt = null;
    this.constraints = [...constraints].map(String);
  }

  revoke() { this.revokedAt = new Date().toISOString(); return this; }

  isActive(now = Date.now()) {
    return !this.revokedAt && (!this.expiresAt || Date.parse(this.expiresAt) > now);
  }

  publicView() { return { ...this, scope: structuredClone(this.scope), constraints: [...this.constraints] }; }
}

export class TrustKernel {
  #grants = new Map();
  #audit;
  #safeMode = false;

  constructor({ audit = null } = {}) { this.#audit = audit; }
  get safeMode() { return this.#safeMode; }

  activateSafeMode(actor = 'emergency-control') {
    this.#safeMode = true;
    this.#audit?.append({ type: 'SAFE_MODE_ACTIVATED', actor, result: 'BLOCK_ALL_OUTBOUND' });
    return { safeMode: true };
  }

  deactivateSafeMode(actor = 'owner') {
    this.#safeMode = false;
    this.#audit?.append({ type: 'SAFE_MODE_DEACTIVATED', actor, result: 'RESTORED' });
    return { safeMode: false };
  }

  issueGrant(input) {
    const grant = new CapabilityGrant(input);
    this.#grants.set(grant.grantId, grant);
    this.#audit?.append({ type: 'CAPABILITY_GRANT_ISSUED', grantId: grant.grantId, subject: grant.subject, resource: grant.resource, capability: grant.capability, autonomyLevel: grant.autonomyLevel, maxRisk: grant.maxRisk });
    return grant.publicView();
  }

  revokeGrant(grantId, actor = 'owner') {
    const grant = this.#grants.get(grantId);
    if (!grant) return { revoked: false, reason: 'UNKNOWN_GRANT' };
    grant.revoke();
    this.#audit?.append({ type: 'CAPABILITY_GRANT_REVOKED', grantId, actor });
    return { revoked: true, grantId };
  }

  listGrants() { return [...this.#grants.values()].map((grant) => grant.publicView()); }

  authorize({ grantId, subject, resource, capability, autonomyLevel = 'A0', risk = 'green', approval = false, ownerAuthenticated = false, metadata = {} } = {}) {
    const grant = this.#grants.get(grantId);
    let result = 'ALLOWED_SIMULATION';
    let reason = 'Simulation is permitted; no external side effect will occur.';
    if (containsRawCredential(metadata)) {
      result = 'DENIED_CREDENTIAL_MATERIAL';
      reason = 'Raw credentials are never accepted by the Trust Kernel.';
    } else if (this.#safeMode) {
      result = 'DENIED_SAFE_MODE';
      reason = 'Emergency Safe Mode blocks all outbound and simulated connector actions.';
    } else if (!grant || !grant.isActive()) {
      result = 'DENIED_GRANT';
      reason = 'Capability grant is missing, expired, or revoked.';
    } else if (grant.subject !== subject || grant.resource !== resource || grant.capability !== capability) {
      result = 'DENIED_SCOPE';
      reason = 'Capability grant does not match the requesting subject, resource, or capability.';
    } else if (!AUTONOMY_LEVELS.includes(autonomyLevel) || autonomyRank(autonomyLevel) > autonomyRank(grant.autonomyLevel)) {
      result = 'DENIED_AUTONOMY';
      reason = 'Requested autonomy exceeds the capability grant.';
    } else if (!RISK_LEVELS.includes(risk) || riskRank(risk) > riskRank(grant.maxRisk)) {
      result = 'DENIED_RISK';
      reason = 'Requested risk exceeds the capability grant.';
    } else if ((autonomyLevel === 'A2' || autonomyRank(autonomyLevel) > 1) && (!approval || !ownerAuthenticated)) {
      result = 'DENIED_APPROVAL';
      reason = 'Explicit owner approval and authenticated owner context are required.';
    }
    const receipt = { type: 'SIMULATED_ACTION', grantId: grant?.grantId || grantId, subject, resource, capability, autonomyLevel, risk, result, simulated: true, executed: false, metadata: containsRawCredential(metadata) ? {} : metadata };
    const audit = this.#audit?.append(receipt);
    return { allowed: result === 'ALLOWED_SIMULATION', simulated: true, executed: false, result, reason, auditId: audit?.id || null };
  }
}
