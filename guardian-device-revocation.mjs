export class GuardianDeviceRevocationRegistry {
  #devices = new Map();
  #audit;

  constructor({ audit = null } = {}) { this.#audit = audit; }

  enroll({ deviceId, subject = 'owner', surfaces = [], metadata = {} } = {}) {
    if (!deviceId) throw new Error('deviceId is required');
    const record = {
      deviceId: String(deviceId),
      subject: String(subject),
      surfaces: [...new Set(surfaces.map(String))],
      state: 'ACTIVE',
      enrolledAt: new Date().toISOString(),
      revokedAt: null,
      reason: null,
      metadata: structuredClone(metadata)
    };
    this.#devices.set(record.deviceId, record);
    this.#audit?.append({ type: 'DEVICE_ENROLLED', deviceId: record.deviceId, subject: record.subject });
    return structuredClone(record);
  }

  revoke(deviceId, reason = 'owner-request') {
    const record = this.#devices.get(String(deviceId));
    if (!record) return { revoked: false, reason: 'UNKNOWN_DEVICE' };
    record.state = 'REVOKED';
    record.revokedAt = new Date().toISOString();
    record.reason = String(reason).slice(0, 300);
    this.#audit?.append({ type: 'DEVICE_REVOKED', deviceId: record.deviceId, reason: record.reason });
    return { revoked: true, device: structuredClone(record) };
  }

  revokeAll(reason = 'global-owner-revocation') {
    const revoked = [];
    for (const record of this.#devices.values()) {
      if (record.state === 'REVOKED') continue;
      revoked.push(this.revoke(record.deviceId, reason).device);
    }
    return { revoked };
  }

  isActive(deviceId) {
    return this.#devices.get(String(deviceId))?.state === 'ACTIVE';
  }

  list() { return [...this.#devices.values()].map((item) => structuredClone(item)); }
}
