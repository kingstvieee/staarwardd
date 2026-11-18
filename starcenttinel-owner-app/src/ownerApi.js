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
export const OWNER_CALLBACK = 'starcenttinel://auth/callback';
export async function requestMagicLink(email) {
  if (!configured() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error('Invalid owner email or configuration');
  const r = await authFetch(`${BASE}/auth/v1/otp`, {
    method: 'POST', headers: headers(),
    body: JSON.stringify({ email, create_user: false }),
  });
  if (!r.ok) throw Error(`Unable to request sign-in link (${r.status})`);
}
// Domain-free fallback: verify a *copied* Supabase email link directly instead of
// visiting its default localhost redirect. The one-time token is sent only to
// this same project's Auth verification endpoint; no website is involved.
export async function exchangeCopiedEmailLink(rawLink) {
  if (!configured()) throw Error('Authentication not configured');
  const link = new URL(String(rawLink || '').trim());
  if (link.origin !== BASE || link.pathname !== '/auth/v1/verify') throw Error('Not a StarCenttinel authentication link');
  const type = link.searchParams.get('type');
  if (type !== 'magiclink' && type !== 'email') throw Error('Unsupported sign-in link type');
  const tokenHash = link.searchParams.get('token_hash') || link.searchParams.get('token');
  if (!tokenHash || !/^[A-Za-z0-9_-]{20,256}$/.test(tokenHash)) throw Error('Invalid sign-in link token');
  const r = await authFetch(`${BASE}/auth/v1/verify`, {
    method: 'POST', headers: headers(),
    body: JSON.stringify({ token_hash: tokenHash, type }),
  });
  if (!r.ok) throw Error('Sign-in link invalid, already used, or expired');
  const data = await r.json();
  if (!data.access_token) throw Error('Missing verified owner session');
  return data.access_token;
}
export async function exchangeMagicLink(url) {
  if (typeof url !== 'string' || !url.startsWith(OWNER_CALLBACK)) throw Error('Invalid owner callback');
  const fragment = url.split('#')[1] || '';
  const query = url.split('?')[1]?.split('#')[0] || '';
  const params = new URLSearchParams(fragment || query);
  if (params.has('error') || params.has('error_code')) throw Error('Sign-in link expired or rejected');
  const tokenHash = params.get('token_hash');
  if (tokenHash) {
    const r = await authFetch(`${BASE}/auth/v1/verify`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ token_hash: tokenHash, type: 'email' }),
    });
    if (!r.ok) throw Error('Owner link verification failed');
    const data = await r.json();
    if (!data.access_token) throw Error('Missing owner session');
    return data.access_token;
  }
  // Supabase's hosted /verify endpoint can redirect with a session in the fragment.
  const accessToken = params.get('access_token');
  if (!accessToken || params.get('token_type') !== 'bearer') throw Error('Missing verified owner session');
  return accessToken;
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