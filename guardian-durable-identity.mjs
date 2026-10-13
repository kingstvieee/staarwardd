import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export class GuardianDurableIdentityStore {
  #filePath;
  #devices = new Map();
  #audit;

  constructor({ filePath = '.guardian/identities.json', audit = null } = {}) {
    this.#filePath = filePath;
    this.#audit = audit;
  }

  async load() {
    try {
      const parsed = JSON.parse(await readFile(this.#filePath, 'utf8'));
      this.#devices = new Map((parsed.devices || []).map((item) => [item.deviceId, item]));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    return this.list();
  }

  async #persist() {
    await mkdir(dirname(this.#filePath), { recursive: true });
    await writeFile(this.#filePath, JSON.stringify({ version: 1, devices: [...this.#devices.values()] }, null, 2), { mode: 0o600 });
  }

  async enroll({ deviceId, subject = 'owner', publicKeyFingerprint, assurance = 'strong', metadata = {} } = {}) {
    if (!deviceId || !publicKeyFingerprint) throw new Error('deviceId and publicKeyFingerprint are required');
    const now = new Date().toISOString();
    const record = {
      deviceId: String(deviceId),
      subject: String(subject),
      publicKeyFingerprint: String(publicKeyFingerprint),
      assurance: String(assurance),
      state: 'ACTIVE',
      enrolledAt: this.#devices.get(String(deviceId))?.enrolledAt || now,
      updatedAt: now,
      revokedAt: null,
      metadata: structuredClone(metadata)
    };
    this.#devices.set(record.deviceId, record);
    await this.#persist();
    this.#audit?.append({ type: 'DURABLE_IDENTITY_ENROLLED', deviceId: record.deviceId, subject: record.subject, assurance: record.assurance });
    return structuredClone(record);
  }

  async revoke(deviceId, reason = 'owner-request') {
    const record = this.#devices.get(String(deviceId));
    if (!record) return { revoked: false, reason: 'UNKNOWN_DEVICE' };
    record.state = 'REVOKED';
    record.revokedAt = new Date().toISOString();
    record.updatedAt = record.revokedAt;
    record.revokeReason = String(reason).slice(0, 300);
    await this.#persist();
    this.#audit?.append({ type: 'DURABLE_IDENTITY_REVOKED', deviceId: record.deviceId, reason: record.revokeReason });
    return { revoked: true, device: structuredClone(record) };
  }

  isTrusted(deviceId, fingerprint = null) {
    const record = this.#devices.get(String(deviceId));
    if (!record || record.state !== 'ACTIVE') return false;
    return fingerprint ? record.publicKeyFingerprint === String(fingerprint) : true;
  }

  list() { return [...this.#devices.values()].map((item) => structuredClone(item)); }
}
