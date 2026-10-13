import { createHmac } from 'node:crypto';

function sign(secret, body) { return createHmac('sha256', secret).update(body).digest('hex'); }

export class GuardianRemoteAuditSink {
  #endpoint;
  #secret;
  #fetch;
  #pending = [];
  #maxPending;

  constructor({ endpoint = process.env.STAARWAARDD_REMOTE_AUDIT_URL || null, secret = process.env.STAARWAARDD_REMOTE_AUDIT_SECRET || null, fetchImpl = fetch, maxPending = 500 } = {}) {
    this.#endpoint = endpoint;
    this.#secret = secret;
    this.#fetch = fetchImpl;
    this.#maxPending = Math.max(10, Math.min(Number(maxPending) || 500, 5000));
  }

  get configured() { return Boolean(this.#endpoint && this.#secret && String(this.#secret).length >= 32); }
  get pendingCount() { return this.#pending.length; }

  enqueue(entry) {
    if (!this.configured) return { queued: false, reason: 'REMOTE_AUDIT_NOT_CONFIGURED' };
    this.#pending.push(structuredClone(entry));
    if (this.#pending.length > this.#maxPending) this.#pending.splice(0, this.#pending.length - this.#maxPending);
    return { queued: true, pending: this.#pending.length };
  }

  async flush({ limit = 100 } = {}) {
    if (!this.configured) return { flushed: 0, remaining: this.#pending.length, configured: false };
    const batch = this.#pending.slice(0, Math.max(1, Math.min(Number(limit) || 100, 500)));
    if (!batch.length) return { flushed: 0, remaining: 0, configured: true };
    const body = JSON.stringify({ version: 1, sentAt: new Date().toISOString(), events: batch });
    const response = await this.#fetch(this.#endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-STAARWAARDD-Audit-Signature': sign(String(this.#secret), body) },
      body
    });
    if (!response.ok) throw new Error(`Remote audit HTTP ${response.status}`);
    this.#pending.splice(0, batch.length);
    return { flushed: batch.length, remaining: this.#pending.length, configured: true };
  }
}

export function createGuardianAuditFanout({ localAudit, remote = new GuardianRemoteAuditSink() } = {}) {
  if (!localAudit?.append) throw new Error('localAudit append interface is required');
  return {
    remote,
    append(event) {
      const receipt = localAudit.append(event);
      remote.enqueue({ ...structuredClone(event), localReceiptId: receipt?.id || receipt?.hash || null, mirroredAt: new Date().toISOString() });
      return receipt;
    },
    async flushRemote(options = {}) { return remote.flush(options); }
  };
}
