// Fail-closed acceptance model. Evidence must be recorded per portal and build.
export const GUARDIAN_PORTALS = Object.freeze(['creativity','work','home','wellbeing','relationships','community','style']);
export const REQUIRED_CASES = Object.freeze(['unauthenticated','wrong_owner','expired_capability','wrong_portal','replayed_nonce','authority_offline','lockdown_denied','valid_signed_capability']);
export function evaluatePortalEvidence(evidence) {
  const output = {};
  for (const portal of GUARDIAN_PORTALS) {
    const cases = evidence?.[portal];
    const missing = REQUIRED_CASES.filter(k => cases?.[k] !== 'PASS');
    output[portal] = {verified: missing.length === 0, passed: REQUIRED_CASES.length-missing.length, total: REQUIRED_CASES.length, missing};
  }
  return output;
}
export function allPortalsVerified(evidence) { return Object.values(evaluatePortalEvidence(evidence)).every(p => p.verified); }
export const INITIAL_EVIDENCE = Object.freeze({}); // No real tests may be invented.
export const OWNER_GATES = Object.freeze({
  emailCodeLogin: 'NOT_DEVICE_VERIFIED',
  passkeyRegistered: false,
  passkeyChallengeVerified: false,
  signedCapabilityVerified: false,
  auditReceiptVerified: false,
  providerRevocationReceiptsVerified: false,
  iosPhysicalTestVerified: false,
  androidPhysicalTestVerified: false,
});
export function emergencyControlsEnabled(gates, portalEvidence) {
  return gates.passkeyRegistered === true && gates.passkeyChallengeVerified === true &&
    gates.signedCapabilityVerified === true && gates.auditReceiptVerified === true &&
    gates.providerRevocationReceiptsVerified === true && gates.iosPhysicalTestVerified === true &&
    gates.androidPhysicalTestVerified === true && allPortalsVerified(portalEvidence);
}
