# StarCenttinel owner app v0.6 — release gates

## Completed
- Preserved approved cinematic storyboard and portrait dashboard assets.
- Read-only owner API deployed separately in Supabase (prior step).
- App requires public Supabase publishable key, authenticates via email code, and reads the owner API.
- 401/403 responses clear owner session; stale responses (>120 seconds) are rejected.
- Offline data and failed reads cannot enable emergency controls.

## Not completed / do not claim production ready
- Authenticated live endpoint request on the owner's actual session.
- Secure on-device token persistence and passkey enrollment (current session is memory-only).
- Signed scoped emergency capability, provider revocation receipts, and seven-portal enforcement.
- Physical iOS/Android device tests, accessibility verification, signed IPA/TestFlight release.
- Security review of independent backend, including audit retention and owner recovery.

## Run
`npm ci && npm test && npx expo start`
Set `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the project's public key; never use a service-role key.

Emergency actions intentionally disabled. No live shutdown attempted.

## v0.8 hardening (development build only)
- 10-second network timeout on owner status reads.
- Rejects malformed live audit/revision payloads and unverified NORMAL mode.
- Clears prior live state when owner session changes or expires.
- No passkeys, signed emergency actions, provider revocation or physical device verification claimed.

## v0.9 local configuration / EAS preparation
- Active Supabase public publishable key configured for Expo public client use (no service-role credentials).
- Fixed sign-in screen being blocked by snapshot loading state.
- Aligned Expo version and iOS/Android build numbers; EAS build profiles added.
- No EAS project ID, signed IPA, TestFlight upload, passkey enrolment, or device login is claimed.
- Read-only security status only; all emergency controls disabled.
