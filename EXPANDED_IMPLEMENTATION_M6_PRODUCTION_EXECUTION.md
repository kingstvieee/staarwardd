# STAARWAARDD M6 — Production Execution

M6 extends the active Guardian implementation without replacing the canonical seven portals, Mission Mode, M4 trust boundaries, or M5 production-trust controls.

## Implemented in M6

1. **Real provider adapters behind the Guardian boundary**
   - OpenAI Responses API adapter.
   - Anthropic Messages API adapter.
   - Gemini GenerateContent adapter.
   - Deterministic local sandbox adapter for tests and staging.
   - Provider credentials and model IDs are supplied only through deployment configuration.
   - Provider output is normalized through the existing safe-render contract.

2. **Provider failover and cost/quality routing**
   - Uses the M5 provider-neutral router.
   - M6 adds orchestration across eligible candidates using cost, latency, quality, provider preference and health state.
   - Failed providers are marked degraded and the next eligible configured provider is attempted.
   - Provider model output does not directly authorize tools or external actions.

3. **Persistent Mission state**
   - Mission snapshots are stored outside source control in `.guardian/missions.json` by default.
   - The Mission engine can export and safely re-import state after restart.
   - Every mutation through the Guardian runtime persists the resulting Mission state.
   - The Milo pilot therefore survives server restarts instead of reverting to a fresh in-memory task.

4. **Remote durable audit fanout**
   - Existing local audit remains the authoritative immediate write path.
   - When `STAARWAARDD_REMOTE_AUDIT_URL` and a strong remote-audit secret are configured, audit events are queued for signed HTTPS fanout.
   - Remote batches use HMAC-SHA256 signatures.
   - Failure to configure a remote backend is reported truthfully and does not fabricate durability.

5. **Signed cross-device shutdown**
   - HMAC-signed LOCKDOWN and RESTORE commands.
   - Commands include nonce, expiry, scope, target device IDs and reason.
   - Replay and expired commands are rejected.
   - Global LOCKDOWN is connected to the isolated action executor and blocks otherwise authorized action execution.
   - Disabled unless `STAARWAARDD_SHUTDOWN_SIGNING_SECRET` is configured.

6. **Safe staging action adapters**
   - Artifact preparation/verification.
   - Notification preview.
   - Calendar reschedule preview.
   - These adapters explicitly have no external side effects.
   - M6 still requires authenticated owner approval before non-dry-run execution through the action gateway.

7. **Privacy-safe observability**
   - Counters, latency histograms and bounded runtime events.
   - Prompt, content, authorization, API key, password, token and secret fields are excluded from event telemetry.

8. **Automated accessibility gate**
   - CI validates document language, viewport, keyboard skip link, live regions, explicit image alt attributes, no positive tabindex, reduced-motion support and visible keyboard focus styling.

9. **Milo controlled-live readiness surface**
   - `/api/guardian/execution/milo` reports the actual Milo Mission, configured live providers, shutdown readiness and staging action adapters.
   - It does not mark Milo complete.
   - Final status remains governed by evidence-backed verification and explicit owner acceptance.

## Runtime endpoints added

- `GET /api/guardian/execution/runtime`
- `POST /api/guardian/execution/model`
- `POST /api/guardian/execution/action`
- `POST /api/guardian/execution/shutdown`
- `POST /api/guardian/execution/audit/flush`
- `GET /api/guardian/execution/observability`
- `GET /api/guardian/execution/milo`

## Configuration-dependent capabilities

The code exists independently from deployment credentials. The runtime reports each capability truthfully.

- OpenAI execution requires `OPENAI_API_KEY` and `OPENAI_MODEL`.
- Anthropic execution requires `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL`.
- Gemini execution requires `GEMINI_API_KEY` and `GEMINI_MODEL`.
- Signed shutdown requires `STAARWAARDD_SHUTDOWN_SIGNING_SECRET` of at least 32 characters.
- Remote audit fanout requires `STAARWAARDD_REMOTE_AUDIT_URL` and `STAARWAARDD_REMOTE_AUDIT_SECRET`.

No key, model ID, external endpoint credential or shutdown secret is hard-coded in source control.

## What M6 does not claim

- It does not claim that any paid provider is connected until deployment credentials are supplied.
- It does not silently spend provider credits during CI.
- It does not enable provider tool calls as Guardian action authority.
- It does not send messages, change calendars, publish content, make purchases or control physical devices through staging adapters.
- It does not claim Milo is finished merely because the execution runtime exists.
- It does not merge the overall Guardian feature branch into `main` without founder approval.

## Verification gate

M6 may merge into the active implementation branch only after all of these pass:

- `npm run check`
- `npm test`
- `npm run security:probe`
- `npm run accessibility:audit`
- GitHub Actions on the M6 branch
- no secret material in source control
