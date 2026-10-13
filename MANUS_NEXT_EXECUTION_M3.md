# MANUS NEXT EXECUTION — M3 Guardian Runtime Integration

Implement M3 directly on the existing `manus-expanded-m1-safety-contracts` branch. Do not restart the app, do not create another repository, and do not replace the current cinematic Hub.

## Read first

1. `EXPANDED_IMPLEMENTATION_M3_GUARDIAN_RUNTIME.md`
2. `guardian-mission-engine.mjs`
3. `guardian-presence-contract.mjs`
4. `guardian-core.mjs`
5. `guardian-trust-kernel.mjs`
6. `guardian-loop-engine.mjs`
7. `server.mjs`
8. current UI files under `public/`
9. current tests under `test/`

## Execute

Wire the new Mission and Presence modules into the existing server and current visual Guardian.

### Mission API

Expose create/list/get/start/evidence/criterion/blocker/resolve-blocker/verify/accept/cancel operations. Do not let client flags create authorization. `accept` requires authenticated OWNER context. Preserve the existing Safety Controller, Trust Kernel, Completion Contract, audit receipts, canonical portals, and prepare-only provider truth.

### Guardian Mission HUD

Add a Mission surface to the current Hub showing objective, criteria, progress, blockers, active tools/adapters, permission state, evidence, next recommended action, action timeline, VERIFY state, and OWNER ACCEPT state. Guardian remains visually present. Do not convert the Hub to a generic chat interface.

### Presence

Wire explicit device/surface enrollment and active surface selection. Support phone, desktop/browser, home-display, and assistive presentation profiles. Sensor access defaults to ASK and requires separate scoped permission. Presence must not imply camera, microphone, screen, location, or device-control permission.

### Milo pilot

Create a deterministic demo/test path that instantiates `createMiloAcceptancePilot()`. Prove that missing evidence or a failed criterion prevents VERIFIED, and that VERIFIED still cannot become USER_ACCEPTED without explicit authenticated owner approval.

## Verification

Run:

- `npm test`
- `npm run check`
- syntax checks for every new/modified `.mjs` and `.js` file
- existing walkthrough regression
- canonical portal alias regression
- lockdown regression
- owner-auth regression
- Mission acceptance regression
- presence/sensor-default regression

Report the exact test count and failures, if any.

## Completion evidence required

Do not return "done" without:

- changed-file list
- exact branch
- final commit SHA
- test output summary
- proof current Hub still loads
- proof canonical portal identities remain Creativity, Work, Home, Well-being, Relationships, Events, Style
- proof Community and Wellbeing aliases remain backward compatible
- proof Mission cannot be USER_ACCEPTED without verification plus explicit owner approval
- proof sensors remain permission-gated
- IMPLEMENTED / PARTIAL / BLOCKED / FUTURE matrix

Do not merge to production `main` or deploy publicly without founder approval.
