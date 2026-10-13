import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

export const SESSION_ASSURANCE_LEVELS = Object.freeze(['basic', 'strong']);

function hashToken(token) {
  return createHash('sha256').update(String(token)).digest('hex');
}

function safeEqualHex(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

function publicSession(session) {
  const { tokenHash, ...view } = session;
  return structuredClone(view);
}

export class GuardianSessionRegistry {
  #sessions = new Map();
  #audit;

  constructor({ audit = null } = {}) {
    this.#audit = audit;
  }

  issue({ subject = 'owner', deviceId, assurance = 'basic', ttlMs = 15 * 60 * 1000, metadata = {} } = {}) {
    if (!deviceId) throw new Error('deviceId is required');
    if (!SESSION_ASSURANCE_LEVELS.includes(assurance)) throw new Error('Invalid assurance level');
    if (!Number.isFinite(ttlMs) || ttlMs < 60_000 || ttlMs > 24 * 60 * 60 * 1000) throw new Error('ttlMs must be between 1 minute and 24 hours');

    const sessionId = `session-${randomUUID()}`;
    const rawToken = `gsess_${randomBytes(32).toString('base64url')}`;
    const createdAt = Date.now();
    const session = {
      sessionId,
      subject: String(subject),
      deviceId: String(deviceId),
      assurance,
      createdAt: new Date(createdAt).toISOString(),
      expiresAt: new Date(createdAt + ttlMs).toISOString(),
      revokedAt: null,
      metadata: structuredClone(metadata),
      tokenHash: hashToken(rawToken)
    };
    this.#sessions.set(sessionId, session);
    this.#audit?.append({ type: 'SESSION_ISSUED', sessionId, subject: session.subject, deviceId: session.deviceId, assurance, expiresAt: session.expiresAt });
    return { session: publicSession(session), token: rawToken };
  }

  authenticate(authorization, { requiredAssurance = 'basic', subject = 'owner' } = {}) {
    if (!SESSION_ASSURANCE_LEVELS.includes(requiredAssurance)) throw new Error('Invalid required assurance');
    if (typeof authorization !== 'string' || !authorization.startsWith('Bearer gsess_')) return { authenticated: false, reason: 'MISSING_SESSION_TOKEN' };
    const rawToken = authorization.slice(7);
    const candidateHash = hashToken(rawToken);
    const requiredRank = SESSION_ASSURANCE_LEVELS.indexOf(requiredAssurance);

    for (const session of this.#sessions.values()) {
      if (!safeEqualHex(session.tokenHash, candidateHash)) continue;
      if (session.revokedAt) return { authenticated: false, reason: 'SESSION_REVOKED', sessionId: session.sessionId };
      if (Date.parse(session.expiresAt) <= Date.now()) return { authenticated: false, reason: 'SESSION_EXPIRED', sessionId: session.sessionId };
      if (session.subject !== subject) return { authenticated: false, reason: 'SUBJECT_MISMATCH', sessionId: session.sessionId };
      if (SESSION_ASSURANCE_LEVELS.indexOf(session.assurance) < requiredRank) return { authenticated: false, reason: 'ASSURANCE_TOO_LOW', sessionId: session.sessionId };
      this.#audit?.append({ type: 'SESSION_AUTHENTICATED', sessionId: session.sessionId, subject: session.subject, assurance: session.assurance });
      return { authenticated: true, session: publicSession(session) };
    }
    return { authenticated: false, reason: 'UNKNOWN_SESSION' };
  }

  revoke(sessionId, actor = 'owner') {
    const session = this.#sessions.get(String(sessionId));
    if (!session) return { revoked: false, reason: 'UNKNOWN_SESSION' };
    if (!session.revokedAt) session.revokedAt = new Date().toISOString();
    this.#audit?.append({ type: 'SESSION_REVOKED', sessionId: session.sessionId, actor });
    return { revoked: true, session: publicSession(session) };
  }

  list() {
    return [...this.#sessions.values()].map(publicSession);
  }
}
