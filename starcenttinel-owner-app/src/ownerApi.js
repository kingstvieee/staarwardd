// Public client configuration only. NEVER add service-role credentials here.
const BASE = 'https://khpprzhqovzhgxdltarq.supabase.co';
const PUBLIC_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const headers = () => ({ 'Content-Type': 'application/json', apikey: PUBLIC_KEY });
export const configured = () => PUBLIC_KEY.startsWith('sb_publishable_') || PUBLIC_KEY.startsWith('eyJ');
async function authFetch(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}
export async function requestEmailCode(email) {
  if (!configured() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error('Invalid owner email or configuration');
  const r = await authFetch(`${BASE}/auth/v1/otp`, { method: 'POST', headers: headers(), body: JSON.stringify({ email, create_user: false }) });
  if (!r.ok) throw Error('Unable to request owner code');
}
export async function verifyEmailCode(email, token) {
  if (!configured() || !/^\d{6,8}$/.test(token)) throw Error('Invalid email verification code');
  const r = await authFetch(`${BASE}/auth/v1/verify`, { method: 'POST', headers: headers(), body: JSON.stringify({ email, token, type: 'email' }) });
  if (!r.ok) throw Error('Owner verification failed');
  const result = await r.json();
  if (!result.access_token) throw Error('No owner session');
  return result.access_token;
}
const REQUEST_TIMEOUT_MS = 10000;
export async function readOwnerStatus(token) {
  if (!configured() || !token) throw Error('Owner session required');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let r;
  try {
    r = await fetch(`${BASE}/functions/v1/starcenttinel-owner-read`, {
      method: 'GET', headers: { ...headers(), Authorization: `Bearer ${token}` }, signal: controller.signal,
    });
  } finally { clearTimeout(timeout); }
  if (r.status === 401 || r.status === 403) { const e = Error('Owner session expired or unauthorized'); e.code = 'SESSION_EXPIRED'; throw e; }
  if (!r.ok) throw Error('Independent owner API unavailable');
  const data = await r.json();
  if (!data.observed_at || !Number.isFinite(Date.parse(data.observed_at)) || Math.abs(Date.now() - Date.parse(data.observed_at)) > 120000) throw Error('Stale security response');
  if (data.live !== true || data.source !== 'independent_owner_api' ||
      !['CAUTION','LOCKDOWN','NORMAL'].includes(data.mode) ||
      !Number.isSafeInteger(data.revision) || data.revision < 0 ||
      typeof data.external_authority_verified !== 'boolean' ||
      !Array.isArray(data.audit) || data.audit.length > 30 ||
      (data.mode === 'NORMAL' && data.external_authority_verified !== true))
    throw Error('Invalid security state');
  return data;
}
