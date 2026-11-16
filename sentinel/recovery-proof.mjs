// Independent-owner recovery verification primitive. Does not perform recovery.
// The private signing key MUST live outside Guardian and outside this repository.
import { createPublicKey, verify } from 'node:crypto';

export function verifyRecoveryCommand(command, { publicKey, now = Date.now(), expectedAudience = 'starcenttinel-control' } = {}) {
  if (!command || typeof command !== 'object' || !publicKey) return { valid: false, reason: 'missing_proof' };
  const { payload, signature } = command;
  if (!payload || typeof payload !== 'object' || typeof signature !== 'string') return { valid: false, reason: 'invalid_envelope' };
  const { audience, action, nonce, issuedAt, expiresAt, revision, targetMode } = payload;
  if (audience !== expectedAudience || action !== 'owner.recover' || typeof nonce !== 'string' ||
      !/^[a-f0-9-]{36}$/i.test(nonce) || !Number.isSafeInteger(revision) || revision < 0 ||
      !Number.isSafeInteger(issuedAt) || !Number.isSafeInteger(expiresAt) ||
      issuedAt > now + 30000 || expiresAt <= now || expiresAt - issuedAt > 120000 ||
      targetMode !== 'NORMAL') return { valid: false, reason: 'invalid_claims' };
  const fields = Object.keys(payload).sort();
  if (fields.join(',') !== 'action,audience,expiresAt,issuedAt,nonce,revision,targetMode') {
    return { valid: false, reason: 'unexpected_claims' };
  }
  let key, bytes;
  try {
    key = publicKey?.type === 'public' ? publicKey : createPublicKey(publicKey);
    if (key.asymmetricKeyType !== 'ed25519') return { valid: false, reason: 'unsupported_key' };
    if (!/^[A-Za-z0-9_-]{86}$/.test(signature)) return { valid: false, reason: 'invalid_signature_encoding' };
    bytes = Buffer.from(signature.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    if (bytes.length !== 64) return { valid: false, reason: 'invalid_signature_encoding' };
    const signed = Buffer.from(JSON.stringify(fields.map(k => [k, payload[k]])));
    if (!verify(null, signed, key, bytes)) return { valid: false, reason: 'invalid_signature' };
  } catch {
    return { valid: false, reason: 'invalid_signature' };
  }
  // Verification alone does NOT authorize recovery. An independent durable,
  // atomic nonce/revision check, hardware-backed step-up, audit and quorum
  // must occur before any state transition.
  return { valid: true, reason: 'signature_verified_only', nonce, revision };
}
