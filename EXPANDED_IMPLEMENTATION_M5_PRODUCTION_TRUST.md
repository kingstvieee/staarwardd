# STAARWAARDD M5 — Production Trust

M5 hardens the existing Guardian runtime without replacing the seven-portal architecture, Mission Mode, safety controller, or M4 trust boundaries.

## Implemented in M5

1. **Durable device identity**
   - Persists enrolled device fingerprints outside source control.
   - Supports revocation that survives process restart.

2. **Cross-device revocation**
   - Active/revoked device registry.
   - Owner-triggered single-device and global revocation.

3. **Signed connector attestations**
   - HMAC-SHA256 signed connector identity, scope, provider and expiry claims.
   - Verification detects tampering, expiry and scope mismatch.
   - Disabled unless a strong secret is configured.

4. **Encrypted persistent memory**
   - AES-256-GCM encrypted at-rest memory store.
   - Uses a secret supplied outside source control.
   - The existing M4 quarantine and explicit owner-review boundary remains upstream.

5. **Provider-neutral model routing**
   - Routes by capability, privacy, cost and latency constraints.
   - Routing never executes the provider directly.

6. **Isolated action executor**
   - Adapters are registered server-side only.
   - Owner authentication and explicit approval are required by the M5 runtime policy.
   - Red-risk actions are refused by this generic executor and require a separate dedicated workflow.
   - Dry-run is the default.

7. **Security evidence registry**
   - Attaches adversarial and runtime security results to missions.
   - A mission security verdict fails when any attached security case fails.

8. **Automated adversarial regression probes**
   - CI now executes defensive prompt-injection probes after syntax and unit tests.
   - Current in-repo probes cover authority override, prompt disclosure, tool directives, hidden markup, prompt-bearing URLs, encoded input and benign false-positive control.

## Truthful configuration status

M5 reports whether signed connector attestations and encrypted persistent memory are actually configured. Their code may exist while the runtime feature remains disabled until a deployment secret is supplied. No default or hard-coded production secret is provided.

## Not claimed as complete

- No real third-party provider adapter is enabled merely because the model router exists.
- No real-world external action adapter is enabled merely because the isolated executor exists.
- External garak / promptmap / PyRIT services are not silently installed in production CI; the repository currently runs its own deterministic defensive regression probes. Those tools can be added to a separate staging red-team job later.
- `main` remains unchanged until review and founder approval.

## Verification gate

M5 is acceptable for merge into the active implementation branch only after:

- `npm run check` passes
- `npm test` passes
- `npm run security:probe` passes
- GitHub Actions verifies the M5 branch
- no secret material exists in source control
