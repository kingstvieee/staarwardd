# StarCenttinel v0.4 security hardening

- Preserved the approved cinematic opening and all original imagery.
- Offline CAUTION revision 1 is a **historical snapshot**, not current live verification.
- No green ALL SYSTEMS ONLINE claim without a verified live source.
- Emergency controls stay disabled regardless of gate count; owner authentication and independent authorization are not implemented.
- Added explicit owner status fetch failure state.
- Added four dependency-free source safety tests.

## Still blocking TestFlight production readiness
No independently authenticated owner API, no passkey ceremony, no signed scoped emergency capability, no provider revocation receipts, no physical iOS/Android device verification, no EAS signed build. CI/source tests are not device tests.

## Run
`npm test` then `npm install` and `npx expo start`. No paid services required for source tests.
