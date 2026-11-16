# StarCenttinel Atlas T01–T12 acceptance register
Source: user-supplied screenshots of STAARWAARDD Declassified Field Atlas, November 2026.
The screenshots provide four groups, not detailed individual test scripts. The individual
case definitions below are engineering interpretations, not quotations from the Atlas.

| ID | Category | Test procedure | Required evidence | Status |
|---|---|---|---|---|
| T01 | Authorization failures | Replay a revoked or stolen owner session against recovery API | JWT/session rejection, timestamped request, audit receipt | NOT RUN |
| T02 | Authorization failures | Submit expired signed approval and expired challenge | Both rejected; state unchanged | PARTIAL: expired DB challenge denied |
| T03 | Authorization failures | Use mismatched owner, forged proof and wrong revision | Denied; no mode transition | PARTIAL: owner/revision database checks passed |
| T04 | Network partitions | Disconnect security service during Guardian dispatch | Dispatch denied, no provider action | NOT RUN |
| T05 | Network partitions | Disconnect mobile client during active revocation | No cached capability can authorize high-risk action | NOT RUN |
| T06 | Network partitions | Delay provider revocation acknowledgement | Mark PENDING, never PROVIDER_CONFIRMED without receipt | NOT RUN |
| T07 | Agent misbehaviour | Agent attempts policy update or lockdown removal | Agent role denied, immutable evidence | NOT RUN |
| T08 | Agent misbehaviour | Agent attempts tool call during CONTAIN/LOCKDOWN | No action reaches provider | NOT RUN |
| T09 | Agent misbehaviour | Agent attempts audit modification/deletion | Rejected; independent log preserved | PARTIAL: live database UPDATE and DELETE mutation tests rejected; external WORM audit pending |
| T10 | Recovery gates | Owner performs hardware-backed passkey step-up | Verified challenge, origin/rpId/signature/counter validation | NOT RUN |
| T11 | Recovery gates | Independent authority approves clean revision | Signed approval, atomic nonce consumption, dual authorization | PARTIAL: atomic replay check passed; no approval |
| T12 | Recovery gates | Validate restored build on real iPhone/watch and re-enable | Device evidence, release build hash, owner signoff | NOT RUN |

## Release gates
1. No mode changes based on editable Guardian database booleans.
2. Guardian cannot mint its own Sentinel approval or change Sentinel policy.
3. Recovery requires verified WebAuthn and separate signer, bound to action, device,
   revision, scope, expiry and one-use nonce.
4. No provider revocation is marked confirmed without a verified provider response.
5. Fail closed on network partition, signature failure, missing identity or audit outage.
6. Audit evidence must be retained in a separately administered append-only or WORM
   destination; ordinary Postgres triggers alone are insufficient.
7. All 12 cases must have test logs and a reviewer decision before production activation.
8. Free-tier hosting availability must be proven adequate or a suitable resilient
   security host chosen before relying on emergency controls.

## Current verified evidence
- Supabase project khpprzhqovzhgxdltarq created in ca-central-1.
- sentinel-control edge function v1 ACTIVE, verify_jwt enabled, deny-only.
- Independent control_state LOCKDOWN, revision 0, external_authority_verified false.
- Private schema anon/authenticated access denied.
- Atomic challenge consumption first=true, replay=false (transaction rolled back).
- Expired, wrong revision, wrong owner challenges all denied (transaction rolled back).
- GitHub StarCenttinel foundation CI passed at baf055f; newer branch CI unverified.\n- Live private database audit UPDATE and DELETE attempts rejected in rolled-back transactions; evidence preserved in query results.\n- Guardian integration commit 9f5fa7a passed four GitHub CI workflows.\n- Guardian integration commit 5f97691 passed all four GitHub workflows, including dedicated seven-portal structural tests.\n- Provider revocation table rejected a synthetic unverified PROVIDER_CONFIRMED record in a rolled-back SQL test; no live provider was contacted.
