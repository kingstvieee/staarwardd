// SINGLE SOURCE OF TRUTH for what the command centre displays.
// Layout and visuals follow the concept boards exactly; the VALUES come from here.
// When the owner-only API is live, make getOwnerStatus() fetch it and return this
// same shape — the screens update with no layout changes (e.g. state 'SECURE',
// health 98, portals.verified 7 will render exactly like the storyboard frame 9).

export const DATA_SOURCE = { mode: 'OFFLINE_SNAPSHOT', label: 'OFFLINE · NOT LIVE', verifiedAt: null, live: false };
// Historical reference only. Do not infer current security state from this snapshot.
export const LIVE_CONTROLS_ENABLED = false;

const SNAPSHOT = {
  system: {
    state: 'CAUTION',            // 'SECURE' | 'CAUTION' | 'LOCKDOWN'
    revision: 1,
    line1: 'Last recorded state only.',
    line2: 'Live verification unavailable.',
  },
  threats: { active: null, monitoring: null, contained24h: null, note: 'Threat feed not connected' },
  health: { pct: null, note: 'Awaiting telemetry' },
  portals: { total: 7, verified: 0, note: 'External actions blocked' },

  // Storyboard frame 9 module row, in order.
  modules: [
    { key: 'threat', name: 'THREAT\nMONITOR', icon: require('../assets/icons/threat.png'), status: 'FEED OFFLINE', level: 'off' },
    { key: 'device', name: 'DEVICE\nNETWORK', icon: require('../assets/icons/device.png'), status: 'UNVERIFIED', level: 'pending' },
    { key: 'backup', name: 'BACKUP &\nRECOVERY', icon: require('../assets/icons/backup.png'), status: 'GUIDE READY', level: 'ok' },
    { key: 'emergency', name: 'EMERGENCY\nMODES', icon: require('../assets/icons/emergency.png'), status: 'LOCKED', level: 'red' },
    { key: 'guardian', name: 'GUARDIAN\nLINK', icon: require('../assets/icons/guardian.png'), status: 'BLOCKED', level: 'pending' },
    { key: 'portal', name: 'PORTAL\nPROTECTION', icon: require('../assets/icons/portal.png'), status: 'CAUTION', level: 'caution' },
    { key: 'field', name: 'FIELD\nKIT', icon: require('../assets/icons/field.png'), status: '2 CONFIGS', level: 'ok' },
  ],

  timeline: [
    { time: 'REV 1', level: 'caution', text: 'Historical state: CAUTION', detail: 'Offline snapshot · timestamp not verified' },
    { time: '—', level: 'off', text: 'Audit feed not connected', detail: 'No events are fabricated' },
    { time: '—', level: 'pending', text: 'Owner authentication not yet verified in this session', detail: 'Passkey enrollment pending' },
  ],

  gates: [
    { name: 'Owner email confirmed', done: false },
    { name: 'Passkey (WebAuthn) on independent device', done: false },
    { name: 'Owner-only read API (state, incidents, audit)', done: false },
    { name: 'Signed scoped emergency capability', done: false },
    { name: 'Durable audit trail + provider receipts', done: false },
    { name: 'Real-device test pass (iOS + Android)', done: false },
  ],
};

export async function getOwnerStatus() {
  // No unauthenticated API calls or secrets in the client.
  // Only an independently authenticated, verified owner API may replace this snapshot.
  return SNAPSHOT;
}

export const gateProgress = gates => {
  const done = gates.filter(g => g.done).length;
  return { done, total: gates.length, pct: Math.round((done / gates.length) * 100) };
};

// Read-only live overlay. No emergency capability is derived from live mode.
export function mergeOwnerRead(snapshot, response) {
  if (!snapshot || !response || response.live !== true || response.source !== 'independent_owner_api') return snapshot;
  const audit = Array.isArray(response.audit) ? response.audit.slice(0, 30).map(e => ({
    time: String(e.created_at || '—').slice(0, 19), level: 'pending',
    text: String(e.event_type || 'Security event').slice(0, 90),
    detail: `Revision ${Number.isSafeInteger(e.state_revision) ? e.state_revision : '—'}`
  })) : [];
  return { ...snapshot, source: { live: true, label: 'LIVE · OWNER VERIFIED' },
    system: { state: response.mode, revision: response.revision,
      line1: 'Independent security database', line2: 'External actions remain blocked pending certification.' },
    timeline: audit.length ? audit : [{ time: '—', level: 'pending', text: 'No audit entries returned', detail: 'Live owner read' }] };
}
