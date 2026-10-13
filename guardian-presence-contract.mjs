export const SURFACE_TYPES = Object.freeze(['phone', 'desktop', 'home-display', 'browser', 'assistive']);

export const DEFAULT_SENSOR_POLICY = Object.freeze({
  microphone: 'ASK',
  camera: 'ASK',
  screen: 'ASK',
  location: 'ASK'
});

function unique(values = []) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

export function createPresenceProfile({
  surface,
  deviceId,
  inputPreferences = [],
  accessibilityNeeds = [],
  sensors = {},
  active = true
} = {}) {
  if (!SURFACE_TYPES.includes(surface)) throw new Error('Unsupported Guardian surface');
  if (!deviceId) throw new Error('deviceId is required');
  const sensorPolicy = { ...DEFAULT_SENSOR_POLICY };
  for (const key of Object.keys(sensorPolicy)) {
    if (['ALLOW', 'ASK', 'DENY'].includes(sensors[key])) sensorPolicy[key] = sensors[key];
  }
  return {
    deviceId: String(deviceId),
    surface,
    active: Boolean(active),
    inputPreferences: unique(inputPreferences),
    accessibilityNeeds: unique(accessibilityNeeds),
    sensors: sensorPolicy,
    ambientSurveillance: false
  };
}

export function adaptGuardianSurface(profile) {
  if (!profile || !SURFACE_TYPES.includes(profile.surface)) throw new Error('Valid presence profile is required');
  const needs = new Set(profile.accessibilityNeeds || []);
  const inputs = new Set(profile.inputPreferences || []);

  const mode = profile.surface === 'phone'
    ? 'compact-presence'
    : profile.surface === 'home-display'
      ? 'ambient-glanceable'
      : profile.surface === 'assistive'
        ? 'assistive-primary'
        : 'hud-workspace';

  const presentation = {
    mode,
    guardianVisible: true,
    chatLogPrimary: false,
    commandSurface: true,
    missionStatusVisible: true,
    actionTimelineVisible: profile.surface !== 'phone',
    voiceEnabled: inputs.has('voice'),
    touchEnabled: inputs.has('touch'),
    keyboardEnabled: inputs.has('keyboard'),
    switchControlEnabled: inputs.has('switch-control'),
    eyeControlCompatible: needs.has('eye-control') || inputs.has('eye-control'),
    screenReaderOptimized: needs.has('screen-reader'),
    highContrast: needs.has('high-contrast'),
    reducedMotion: needs.has('reduced-motion'),
    largeTargets: needs.has('motor-access') || profile.surface === 'assistive'
  };

  return {
    deviceId: profile.deviceId,
    surface: profile.surface,
    presentation,
    sensors: { ...profile.sensors },
    safety: {
      requiresExplicitSensorGrant: true,
      crossDeviceActionsRequireAuthenticatedSession: true,
      highImpactActionsRequireOwnerApproval: true,
      ambientSurveillance: false
    }
  };
}

export class GuardianPresenceRegistry {
  #profiles = new Map();

  enroll(profile) {
    const normalized = createPresenceProfile(profile);
    this.#profiles.set(normalized.deviceId, normalized);
    return structuredClone(normalized);
  }

  revoke(deviceId) {
    return this.#profiles.delete(String(deviceId));
  }

  setActive(deviceId, active) {
    const profile = this.#profiles.get(String(deviceId));
    if (!profile) throw new Error('Device not enrolled');
    profile.active = Boolean(active);
    return structuredClone(profile);
  }

  get(deviceId) {
    const profile = this.#profiles.get(String(deviceId));
    return profile ? structuredClone(profile) : null;
  }

  activeSurfaces() {
    return [...this.#profiles.values()].filter((profile) => profile.active).map((profile) => adaptGuardianSurface(profile));
  }
}
