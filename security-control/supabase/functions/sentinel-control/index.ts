// StarCenttinel independent API: deliberately DENY-ONLY until independent
// owner WebAuthn, signed capabilities, durable revocation and audit are verified.
// verify_jwt must remain enabled at the Supabase gateway.
const HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
};
function response(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: HEADERS });
}
Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  if (req.method === 'GET' && url.pathname.endsWith('/health')) {
    return response(200, {
      service: 'starcenttinel-security-control',
      state: 'LOCKDOWN',
      enforcement: 'not_activated',
      ready_for_live_actions: false,
    });
  }
  if (req.method !== 'POST') {
    return response(405, { error: 'method_not_allowed' });
  }
  // No action endpoint accepts caller-controlled mode, credentials or
  // signature claims. This is a safe, independent deployment milestone.
  return response(423, {
    error: 'independent_authority_not_provisioned',
    state: 'LOCKDOWN',
    retryable: false,
  });
});
