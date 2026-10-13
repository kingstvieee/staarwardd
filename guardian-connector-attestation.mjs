import { createHmac, timingSafeEqual } from 'node:crypto';

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function mac(secret, payload) {
  return createHmac('sha256', secret).update(canonical(payload)).digest('hex');
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

export class ConnectorAttestationAuthority {
  #secret;
  constructor({ secret } = {}) {
    if (!secret || String(secret).length < 32) throw new Error('Attestation secret must be at least 32 characters');
    this.#secret = String(secret);
  }

  issue({ connectorId, provider, scopes = [], expiresAt, metadata = {} } = {}) {
    if (!connectorId || !provider) throw new Error('connectorId and provider are required');
    if (!expiresAt || !Number.isFinite(Date.parse(expiresAt))) throw new Error('Valid expiresAt is required');
    const payload = {
      version: 'connector-attestation-v1',
      connectorId: String(connectorId),
      provider: String(provider),
      scopes: [...new Set(scopes.map(String))].sort(),
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
      metadata: structuredClone(metadata)
    };
    return { payload, signature: mac(this.#secret, payload) };
  }

  verify(attestation, { connectorId = null, requiredScope = null, now = Date.now() } = {}) {
    if (!attestation?.payload || !attestation?.signature) return { valid: false, reason: 'MALFORMED_ATTESTATION' };
    const expected = mac(this.#secret, attestation.payload);
    if (!safeEqual(expected, attestation.signature)) return { valid: false, reason: 'INVALID_SIGNATURE' };
    if (Date.parse(attestation.payload.expiresAt) <= now) return { valid: false, reason: 'ATTESTATION_EXPIRED' };
    if (connectorId && attestation.payload.connectorId !== connectorId) return { valid: false, reason: 'CONNECTOR_MISMATCH' };
    if (requiredScope && !attestation.payload.scopes.includes(requiredScope)) return { valid: false, reason: 'SCOPE_MISSING' };
    return { valid: true, payload: structuredClone(attestation.payload) };
  }
}
