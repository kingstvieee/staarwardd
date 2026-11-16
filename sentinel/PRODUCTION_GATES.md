# StarCenttinel — implementation gate

Status: DEVELOPMENT ONLY. Do not describe this module as live protection.

## Implemented in this branch
- Four modes: NORMAL, CAUTION, CONTAIN, LOCKDOWN.
- Scoped allowlist for supported actions; fail closed on unknown actions.
- Approval and step-up flags required for high-risk actions.
- Offline restrictions and local state persistence.
- Local preflight gateway and unit tests.

## Critical limitations
1. The caller supplies principal, scopes, approval and stepUp booleans. They are **not verified credentials**. Never accept these values from an untrusted request body.
2. The transition API accepts actor/verified strings; these are not independent authentication. Do not expose transition directly to Guardian, public HTTP endpoints or provider integrations.
3. Local file persistence is not an independent, durable, tamper-resistant security control. Concurrent writes, crashes, storage failure and multiple replicas require a transactional authoritative store.
4. In-memory audit hashes are not a chained, signed or externally retained audit trail.
5. Preflight does not cancel an already-running action or revoke provider credentials; a production system needs short-lived leases, independent provider-side enforcement, queue cancellation and revocation acknowledgements.
6. No owner console, passkeys, strong step-up, emergency receipts, recovery ceremony or security monitoring is connected.
7. The existing application is a prototype; its simulated approvals are not real-world authorization.

## Required production acceptance gates
- Independent control plane deployed with separate identity, secrets and infrastructure authority.
- All provider invocations route through server-side policy enforcement; no bypass paths.
- Verified principal and scopes from server-trusted identity; no client-supplied authority.
- Durable atomic policy state with monotonic revisions and fail-closed outage behavior.
- Emergency containment stops queues, revokes credentials, blocks actuators and provides signed receipts.
- Independent recovery with strong authentication and break-glass fallback.
- Immutable external audit sink and incident alerts.
- Unit, integration, adversarial, race-condition, device and recovery tests pass.
- Review and approval before merge or deployment.

## Execution
Run `npm test` and `npm run check` on a machine with Node.js 20+.
No test result is asserted until command output or CI evidence is captured.
