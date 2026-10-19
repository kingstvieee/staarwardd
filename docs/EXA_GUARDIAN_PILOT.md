# Exa 3 Guardian research pilot

Optional provider: Exa Search API. Existing OpenAI planning and deterministic demo paths are unchanged.

## Configuration
Set `EXA_API_KEY` as a **server-side environment variable** in your deployment. Never put it in `public/`, frontend JavaScript, commits, or screenshots. No Exa account or paid plan is automatically created by this change.

## Endpoint
`POST /api/research` with `{"query":"Toronto arts grants 2026"}`.
Returns `{provider:"exa",available:true,sources:[{title,url,highlights}]}` when Exa responds.
Missing credentials, timeouts, and provider errors return HTTP 503 and `available:false`. Blank queries return HTTP 400.

This is **read-only retrieval**, not autonomous outreach, registrations, purchases, or publishing. Verify retrieved claims before acting; retrieved text is untrusted. For public deployment, add authentication, per-user rate limits, usage quotas, and an allowlist or abuse prevention policy before enabling broad access. Keep existing portal UI unchanged until reviewed.

## Validation
1. `npm run check` and `npm test`.
2. Without EXA_API_KEY: POST /api/research must return 503 without leaking secrets.
3. With a valid key: verify 200, source URLs, response speed and actual billed usage.
4. Verify /api/plan and Guardian voice flows remain unchanged.
5. Add rate limits and authentication before enabling this endpoint publicly.
