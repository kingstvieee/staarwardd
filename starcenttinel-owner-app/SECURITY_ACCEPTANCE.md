# StarCenttinel owner app v0.7 — security acceptance

The app is a prototype. Live emergency shutdown and recovery remain disabled.

## Owner authentication
- Email-code login exists but has **not been verified on the owner's physical iPhone**.
- Email-code login is **not** a passkey. Real WebAuthn registration and hardware-backed challenge verification are **not implemented**.
- Do not enter codes, tokens or secrets into chat. Complete sign-in only inside the application.

## Independent authority
- Read-only Supabase Edge Function `starcenttinel-owner-read` deployed previously; production end-to-end owner-token test not established.
- No signed emergency capability issuance, revocation receipt or production enforcement certification.
- Unavailable/stale authority must deny all privileged actions.

## Seven portal matrix
Each portal (creativity, work, home, wellbeing, relationships, community, style) requires evidence for eight cases: unauthenticated, wrong owner, expired capability, wrong portal, replayed nonce, authority offline, lockdown denied, and valid signed capability. The last case is a positive path and may only pass in a test environment with legitimate verified authority. A synthetic matrix is a unit test **not** proof of live Guardian enforcement.

## Real device acceptance
1. Install a development build via the authorized Apple Developer account.
2. On the physical iPhone, sign in through the configured email-code flow without sharing the code.
3. Confirm the owner API shows an observed timestamp and live mode matching an independent database read.
4. Sign out, expire the session, disconnect the network and verify the app shows OFFLINE / UNVERIFIED.
5. Verify all privileged buttons remain disabled.
6. Register and verify an owner passkey only after implementing an independent WebAuthn server.
7. Execute eight tests per portal against a dedicated test environment and archive signed evidence.

Do not report the app as TestFlight ready or controls as operational without device evidence and independent security review.
