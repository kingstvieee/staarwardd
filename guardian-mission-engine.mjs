import { createHash, randomUUID } from 'node:crypto';

export const MISSION_STATUSES = Object.freeze([
  'PLANNED',
  'IN_PROGRESS',
  'BLOCKED',
  'IMPLEMENTED_UNVERIFIED',
  'VERIFIED',
  'USER_ACCEPTED',
  'CANCELLED'
]);

export const CRITERION_STATES = Object.freeze(['PENDING', 'PASSED', 'FAILED']);

function clone(value) {
  return structuredClone(value);
}

function now() {
  return new Date().toISOString();
}

function normalizeText(value, max = 1000) {
  return String(value || '').trim().slice(0, max);
}

function hashArtifact(input) {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

export class GuardianMissionEngine {
  #missions = new Map();
  #audit;

  constructor({ audit = null } = {}) {
    this.#audit = audit;
  }

  #record(event) {
    if (this.#audit?.append) return this.#audit.append(event);
    return { id: `event-${randomUUID()}`, at: now(), ...event };
  }

  create({ title, objective, portals = [], criteria = [], owner = 'owner', metadata = {} } = {}) {
    const safeTitle = normalizeText(title, 240);
    const safeObjective = normalizeText(objective, 1200);
    if (!safeTitle || !safeObjective) throw new Error('Mission title and objective are required');
    if (!Array.isArray(criteria) || criteria.length === 0) throw new Error('At least one completion criterion is required');

    const normalizedCriteria = criteria.map((item, index) => {
      const source = typeof item === 'string' ? { text: item } : item || {};
      const text = normalizeText(source.text, 500);
      if (!text) throw new Error(`Criterion ${index + 1} is empty`);
      return {
        id: normalizeText(source.id, 120) || `criterion-${index + 1}`,
        text,
        required: source.required !== false,
        state: 'PENDING',
        evidenceIds: [],
        note: ''
      };
    });

    const mission = {
      id: `mission-${randomUUID()}`,
      title: safeTitle,
      objective: safeObjective,
      owner,
      portals: [...new Set(portals.map((portal) => normalizeText(portal, 80)).filter(Boolean))],
      status: 'PLANNED',
      criteria: normalizedCriteria,
      evidence: [],
      blockers: [],
      metadata: clone(metadata),
      createdAt: now(),
      updatedAt: now(),
      acceptedAt: null
    };

    this.#missions.set(mission.id, mission);
    this.#record({ type: 'MISSION_CREATED', missionId: mission.id, title: mission.title, criterionCount: mission.criteria.length, portals: mission.portals });
    return clone(mission);
  }

  start(missionId) {
    const mission = this.#require(missionId);
    if (mission.status === 'USER_ACCEPTED' || mission.status === 'CANCELLED') throw new Error('Mission is closed');
    mission.status = 'IN_PROGRESS';
    mission.updatedAt = now();
    this.#record({ type: 'MISSION_STARTED', missionId });
    return clone(mission);
  }

  addEvidence(missionId, { kind = 'artifact', description, uri = null, criterionIds = [], metadata = {}, verifiedBy = null } = {}) {
    const mission = this.#require(missionId);
    const safeDescription = normalizeText(description, 1200);
    if (!safeDescription) throw new Error('Evidence description is required');
    const validIds = new Set(mission.criteria.map((criterion) => criterion.id));
    const links = [...new Set(criterionIds.map(String))];
    if (links.some((id) => !validIds.has(id))) throw new Error('Evidence references an unknown criterion');

    const artifactBody = {
      kind: normalizeText(kind, 80) || 'artifact',
      description: safeDescription,
      uri: uri ? normalizeText(uri, 1000) : null,
      criterionIds: links,
      metadata: clone(metadata)
    };
    const artifact = {
      id: `evidence-${randomUUID()}`,
      ...artifactBody,
      hash: hashArtifact(artifactBody),
      verifiedBy: verifiedBy ? normalizeText(verifiedBy, 160) : null,
      createdAt: now()
    };
    mission.evidence.push(artifact);
    for (const criterion of mission.criteria) {
      if (links.includes(criterion.id) && !criterion.evidenceIds.includes(artifact.id)) criterion.evidenceIds.push(artifact.id);
    }
    if (!['BLOCKED', 'USER_ACCEPTED', 'CANCELLED'].includes(mission.status)) mission.status = 'IMPLEMENTED_UNVERIFIED';
    mission.updatedAt = now();
    this.#record({ type: 'MISSION_EVIDENCE_ADDED', missionId, evidenceId: artifact.id, criterionIds: links, artifactHash: artifact.hash });
    return clone(artifact);
  }

  setCriterion(missionId, criterionId, { state, note = '' } = {}) {
    const mission = this.#require(missionId);
    if (!CRITERION_STATES.includes(state)) throw new Error('Invalid criterion state');
    const criterion = mission.criteria.find((candidate) => candidate.id === criterionId);
    if (!criterion) throw new Error('Criterion not found');
    criterion.state = state;
    criterion.note = normalizeText(note, 800);
    mission.updatedAt = now();
    if (state === 'FAILED') mission.status = 'IMPLEMENTED_UNVERIFIED';
    this.#record({ type: 'MISSION_CRITERION_UPDATED', missionId, criterionId, state, evidenceCount: criterion.evidenceIds.length });
    return clone(criterion);
  }

  reportBlocker(missionId, { reason, severity = 'medium', suggestedNextAction = '', permissionRequired = false } = {}) {
    const mission = this.#require(missionId);
    const blocker = {
      id: `blocker-${randomUUID()}`,
      reason: normalizeText(reason, 1000),
      severity: normalizeText(severity, 40) || 'medium',
      suggestedNextAction: normalizeText(suggestedNextAction, 1000),
      permissionRequired: Boolean(permissionRequired),
      resolved: false,
      createdAt: now(),
      resolvedAt: null
    };
    if (!blocker.reason) throw new Error('Blocker reason is required');
    mission.blockers.push(blocker);
    mission.status = 'BLOCKED';
    mission.updatedAt = now();
    this.#record({ type: 'MISSION_BLOCKED', missionId, blockerId: blocker.id, reason: blocker.reason, severity: blocker.severity, permissionRequired: blocker.permissionRequired });
    return clone(blocker);
  }

  resolveBlocker(missionId, blockerId, note = '') {
    const mission = this.#require(missionId);
    const blocker = mission.blockers.find((candidate) => candidate.id === blockerId);
    if (!blocker) throw new Error('Blocker not found');
    blocker.resolved = true;
    blocker.resolutionNote = normalizeText(note, 800);
    blocker.resolvedAt = now();
    if (!mission.blockers.some((candidate) => !candidate.resolved)) mission.status = 'IN_PROGRESS';
    mission.updatedAt = now();
    this.#record({ type: 'MISSION_BLOCKER_RESOLVED', missionId, blockerId });
    return clone(blocker);
  }

  verify(missionId, { verifier = 'guardian-independent-verifier' } = {}) {
    const mission = this.#require(missionId);
    const unresolvedBlockers = mission.blockers.filter((blocker) => !blocker.resolved);
    const required = mission.criteria.filter((criterion) => criterion.required);
    const failed = required.filter((criterion) => criterion.state !== 'PASSED');
    const withoutEvidence = required.filter((criterion) => criterion.evidenceIds.length === 0);
    const verified = unresolvedBlockers.length === 0 && failed.length === 0 && withoutEvidence.length === 0;

    mission.status = verified ? 'VERIFIED' : unresolvedBlockers.length ? 'BLOCKED' : 'IMPLEMENTED_UNVERIFIED';
    mission.updatedAt = now();
    const result = {
      verified,
      status: mission.status,
      failedCriteria: failed.map((criterion) => criterion.id),
      criteriaWithoutEvidence: withoutEvidence.map((criterion) => criterion.id),
      unresolvedBlockers: unresolvedBlockers.map((blocker) => blocker.id),
      verifier: normalizeText(verifier, 160)
    };
    this.#record({ type: 'MISSION_VERIFICATION', missionId, ...result });
    return result;
  }

  accept(missionId, { approved = false, actor = 'owner' } = {}) {
    const mission = this.#require(missionId);
    if (!approved) throw new Error('Explicit owner approval is required');
    if (mission.status !== 'VERIFIED') throw new Error('Mission must be VERIFIED before user acceptance');
    mission.status = 'USER_ACCEPTED';
    mission.acceptedAt = now();
    mission.updatedAt = mission.acceptedAt;
    this.#record({ type: 'MISSION_USER_ACCEPTED', missionId, actor: normalizeText(actor, 160) || 'owner' });
    return clone(mission);
  }

  cancel(missionId, reason = 'owner_cancelled') {
    const mission = this.#require(missionId);
    mission.status = 'CANCELLED';
    mission.cancelReason = normalizeText(reason, 500);
    mission.updatedAt = now();
    this.#record({ type: 'MISSION_CANCELLED', missionId, reason: mission.cancelReason });
    return clone(mission);
  }

  get(missionId) {
    const mission = this.#missions.get(missionId);
    return mission ? clone(mission) : null;
  }

  list() {
    return [...this.#missions.values()].map(clone);
  }

  #require(missionId) {
    const mission = this.#missions.get(missionId);
    if (!mission) throw new Error('Mission not found');
    return mission;
  }
}

export function createMiloAcceptancePilot(engine) {
  if (!engine || typeof engine.create !== 'function') throw new Error('GuardianMissionEngine is required');
  return engine.create({
    title: 'Milo Episode Completion Pilot',
    objective: 'Deliver the complete Milo episode against the approved story, continuity, audio, dialogue, runtime and export requirements, with evidence for every required criterion and explicit owner sign-off.',
    portals: ['Creativity', 'Work'],
    criteria: [
      { id: 'story-cohesion', text: 'Story is coherent from opening through problem, cause/effect, solution and resolution.' },
      { id: 'character-continuity', text: 'Character designs, wardrobe, proportions and identities remain consistent across the episode.' },
      { id: 'dialogue-lipsync', text: 'Required characters speak and visible dialogue is lip-synced to the approved lines.' },
      { id: 'sound-design', text: 'Actions, environments and transitions include natural sound effects and ambience where required.' },
      { id: 'music-credits', text: 'Opening theme and closing credits are present and conform to the approved series format.' },
      { id: 'runtime', text: 'Final runtime matches the approved target or an explicitly approved revision.' },
      { id: 'visual-review', text: 'Full episode has been visually reviewed for missing, duplicated, frozen or inconsistent shots.' },
      { id: 'audio-review', text: 'Full episode has been reviewed for missing dialogue, clipping, silence gaps and mix problems.' },
      { id: 'export', text: 'Final deliverable exports successfully and can be played from beginning to end.' },
      { id: 'owner-acceptance', text: 'Owner reviews the verified deliverable before the mission may be marked USER_ACCEPTED.' }
    ],
    metadata: { pilot: true, completionRule: 'No DONE state without criteria evidence, independent verification and explicit owner acceptance.' }
  });
}
