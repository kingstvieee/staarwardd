# StarCenttinel v1.0 — release gate

**Source only, not an IPA or TestFlight release.**

Completed: public Supabase configuration; owner email OTP source flow; independent read-only API integration; 10-second authentication/status request timeouts; offline fail-closed state; cinema assets; versioned EAS profiles; automated source tests.

Not completed: owner email OTP verified with a real iPhone; passkey enrollment and proof of device binding; emergency capability signing; revocation receipts; live seven-portal enforcement; signed iOS IPA; TestFlight upload; on-device acceptance tests.

The app cannot issue emergency shutdown or revocation. Do not enable these controls until independently verified.

For a signed build, an authenticated Expo EAS account, linked Expo project ID, Apple signing authorization and device/TestFlight distribution are required. Never paste Apple credentials or OTP codes into this repository.

Run `npm ci`, `npm test`, `npx expo-doctor`, then `npx eas-cli build:configure` and `npx eas-cli build --platform ios --profile preview` from an authenticated EAS environment. These last commands have NOT been run successfully here.
