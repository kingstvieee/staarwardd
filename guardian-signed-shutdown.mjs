import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

function stable(value) { return JSON.stringify(value, Object.keys(value).sort()); }
function hmac(secret, payload) { return createHmac('sha256', secret).update(payload).digest('hex'); }
function safeEqual(a, b) { const x = Buffer.from(String(a)); const y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); }

export class GuardianSignedShutdownAuthority {
  #secret;
  #seen = new Set();
  #state = 'ACTIVE';
  #audit;

  constructor({ secret, audit = null } = {}) {
    if (!secret || String(secret).length < 32) throw new Error('Shutdown secret must be at least 32 characters');
    this.#secret = String(secret);
    this.#audit = audit;
  }

  get state() { return this.#state; }

  issue({ operation = 'LOCKDOWN', scope = 'ALL_DEVICES', deviceIds = [], reason = 'owner-request', ttlMs = 5 * 60 * 1000 } = {}) {
    if (!['LOCKDOWN','RESTORE'].includes(operation)) throw new Error('Invalid shutdown operation');
    const issuedAt = Date.now();
    const payload = {
      version: 1,
      commandId: `shutdown-${randomUUID()}`,
      nonce: randomUUID(),
      operation,
      scope,
      deviceIds: [...new Set((deviceIds || []).map(String))],
      reason: String(reason).slice(0,300),
      issuedAt: new Date(issuedAt).toISOString(),
      expiresAt: new Date(issuedAt + Math.max(30_000, Math.min(Number(ttlMs) || 300000, 15 * 60 * 1000))).toISOString()
    };
    return { payload, signature: hmac(this.#secret, stable(payload)) };
  }

  verify(command) {
    const payload = command?.payload;
    const signature = command?.signature;
    if (!payload || !signature) return { valid: false, reason: 'MISSING_COMMAND' };
    const expected = hmac(this.#secret, stable(payload));
    if (!safeEqual(signature, expected)) return { valid: false, reason: 'BAD_SIGNATURE' };
    if (Date.parse(payload.expiresAt) <= Date.now()) return { valid: false, reason: 'EXPIRED' };
    if (this.#seen.has(payload.nonce)) return { valid: false, reason: 'REPLAY' };
    if (!['LOCKDOWN','RESTORE'].includes(payload.operation)) return { valid: false, reason: 'INVALID_OPERATION' };
    return { valid: true, payload: structuredClone(payload) };
  }

  apply(command) {
    const checked = this.verify(command);
    if (!checked.valid) return checked;
    this.#seen.add(checked.payload.nonce);
    this.#state = checked.payload.operation === 'LOCKDOWN' ? 'LOCKDOWN' : 'ACTIVE';
    this.#audit?.append({ type: 'SIGNED_SHUTDOWN_APPLIED', commandId: checked.payload.commandId, operation: checked.payload.operation, scope: checked.payload.scope, deviceIds: checked.payload.deviceIds, reason: checked.payload.reason });
    return { valid: true, applied: true, state: this.#state, commandId: checked.payload.commandId, operation: checked.payload.operation, scope: checked.payload.scope, deviceIds: checked.payload.deviceIds };
  }
}
