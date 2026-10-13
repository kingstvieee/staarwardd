# STAARWAARDD M4 — Trust Expansion

## Status
Implemented on the `m4-trust-expansion` branch and gated by Guardian Runtime CI before integration into the active implementation branch.

## Purpose
M4 extends the M3 Guardian Runtime so external data, connectors, memory, provider transcripts, and rendered model output cannot silently acquire authority.

## Implemented modules

### `guardian-session-identity.mjs`
- Short-lived Guardian owner sessions.
- `basic` and `strong` assurance levels.
- Random bearer tokens returned only at issuance.
- Only token hashes are retained in the registry.
- Expiry and revocation are enforced.
- Session issuance, authentication, and revocation are auditable.

### `guardian-connector-provenance.mjs`
- Registers connector identity and permitted resource scope.
- Wraps connector material with provenance metadata and an integrity hash.
- Connector content is always `UNTRUSTED_DATA`.
- Provenance proves source metadata, not instruction authority.
- Credential-like metadata is rejected.

### `guardian-memory-quarantine.mjs`
- Every memory proposal enters `QUARANTINED` state first.
- External/high-risk material is not directly write-eligible.
- Ordinary user memory still requires authenticated explicit approval.
- Reject/approve decisions are auditable.

### `guardian-provider-boundary.mjs`
- Clients may provide only `user` role content.
- System, developer, tool, reasoning, and provider-internal objects are rejected.
- External material stays in data envelopes and cannot authorize tools, policy changes, or memory writes.
- Provider roles remain server-controlled.

### `guardian-safe-render.mjs`
- Model output is treated as text-first content.
- HTML is escaped.
- Network-active or executable markup is detected.
- Preferred DOM sink is `textContent`.
- `innerHTML`, script execution, remote resource loading, and automatic navigation are prohibited by the rendering contract.
- Streamed output is reassessed after chunks are combined.

### `guardian-trust-runtime.mjs`
Exposes the M4 trust layer through authenticated runtime endpoints:
- `/api/guardian/trust/runtime`
- `/api/guardian/trust/session`
- `/api/guardian/trust/connector/register`
- `/api/guardian/trust/connector/wrap`
- `/api/guardian/trust/connectors`
- `/api/guardian/trust/memory/propose`
- `/api/guardian/trust/memory/review`
- `/api/guardian/trust/memory`
- `/api/guardian/trust/provider/validate`
- `/api/guardian/trust/render`

## Prompt-security improvement
Split fragments are normalized into one logical request before inspection. This closes a gap where an instruction could be divided across retrieved fragments or consecutive external payloads.

## Runtime integration
`guardian-runtime-server.mjs` now exposes M4 trust capabilities alongside Mission Mode and adaptive Guardian presence. Strong Guardian sessions can satisfy owner-authenticated operations after bootstrap authentication.

## Verification
`test/guardian-m4-trust-expansion.test.mjs` covers:
- strong session authentication and revocation
- connector provenance without instruction authority
- memory quarantine and approval requirements
- provider transcript schema enforcement
- safe rendering and streamed output reassessment
- split-fragment prompt inspection

The standard CI path remains:

```text
npm ci
npm run check
npm test
```

## Intentionally not claimed as complete
M4 does not yet provide a production identity provider, durable distributed session store, signed connector attestations, encrypted persistent memory graph, or live automated third-party red-team scanner against a production endpoint. Those belong to the next production-hardening milestone and must not be represented as already delivered.
