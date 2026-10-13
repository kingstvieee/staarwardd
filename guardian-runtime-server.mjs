import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { handleRequest as legacyHandleRequest } from './server.mjs';
import { guardianLedger, isOwnerTokenValid } from './guardian-core.mjs';
import { createGuardianAuditFanout } from './guardian-remote-audit.mjs';
import { GuardianMissionEngine, createMiloAcceptancePilot } from './guardian-mission-engine.mjs';
import { GuardianMissionStore } from './guardian-mission-store.mjs';
import { GuardianPresenceRegistry } from './guardian-presence-contract.mjs';
import { createGuardianTrustRuntime } from './guardian-trust-runtime.mjs';
import { createGuardianExecutionRuntime } from './guardian-execution-runtime.mjs';

const port = Number(process.env.PORT || 3000);
export const guardianAudit = createGuardianAuditFanout({ localAudit: guardianLedger });
export const guardianMissions = new GuardianMissionEngine({ audit: guardianAudit });
export const guardianMissionStore = new GuardianMissionStore();
export const guardianPresence = new GuardianPresenceRegistry();
export const guardianTrust = createGuardianTrustRuntime({ audit: guardianAudit, ownerTokenValidator: isOwnerTokenValid });
export const guardianExecution = createGuardianExecutionRuntime({ trust: guardianTrust, missions: guardianMissions, audit: guardianAudit, auditFanout: guardianAudit });
let missionStateLoaded = false;

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

function bodyJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) reject(new Error('Body too large'));
    });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

async function ensureMissionStateLoaded() {
  if (missionStateLoaded) return;
  const state = await guardianMissionStore.load();
  guardianMissions.importState(state, { replace: true });
  missionStateLoaded = true;
}

async function persistMissionState() {
  return guardianMissionStore.save(guardianMissions.list());
}

function ownerRequired(req, res) {
  const auth = guardianTrust.authentication(req, 'strong');
  if (auth.authenticated) return true;
  json(res, 401, { error: 'Authenticated owner required', reason: auth.reason || 'UNAUTHENTICATED' });
  return false;
}

function missionSummary(mission) {
  const required = mission.criteria.filter((criterion) => criterion.required);
  const passed = required.filter((criterion) => criterion.state === 'PASSED').length;
  return {
    id: mission.id,
    title: mission.title,
    objective: mission.objective,
    status: mission.status,
    portals: mission.portals,
    progress: { passed, required: required.length },
    blockers: mission.blockers.filter((blocker) => !blocker.resolved).length,
    evidence: mission.evidence.length,
    updatedAt: mission.updatedAt,
    acceptedAt: mission.acceptedAt
  };
}

async function ensureMiloPilot() {
  await ensureMissionStateLoaded();
  const existing = guardianMissions.list().find((mission) => mission.metadata?.pilot === true && mission.title === 'Milo Episode Completion Pilot');
  if (existing) return existing;
  const created = createMiloAcceptancePilot(guardianMissions);
  await persistMissionState();
  return created;
}

async function handleRuntimeApi(req, res) {
  const path = String(req.url || '/').split('?')[0];
  await ensureMissionStateLoaded();

  if (req.method === 'GET' && path === '/api/guardian/runtime') {
    return json(res, 200, {
      runtime: 'M6_PRODUCTION_EXECUTION',
      hud: true,
      missionEngine: true,
      persistentMissionState: true,
      presenceRegistry: true,
      trustExpansion: true,
      productionExecution: true,
      sessionIdentity: true,
      durableIdentity: true,
      connectorProvenance: true,
      signedConnectorAttestations: Boolean(guardianTrust.attestations),
      memoryQuarantine: true,
      encryptedMemory: Boolean(guardianTrust.encryptedMemory),
      providerBoundary: true,
      providerNeutralModelRouter: true,
      liveProviderAdapters: guardianExecution.providers.list(),
      isolatedActionExecutor: true,
      securityEvidenceRegistry: true,
      crossDeviceRevocation: true,
      signedCrossDeviceShutdown: Boolean(guardianExecution.shutdown),
      remoteAuditConfigured: Boolean(guardianAudit.remote.configured),
      safeRendering: true,
      ownerAcceptanceRequired: true,
      sensorsDefault: 'ASK',
      ambientSurveillance: false,
      missions: guardianMissions.list().map(missionSummary),
      activeSurfaces: guardianPresence.activeSurfaces()
    });
  }

  if (req.method === 'GET' && path === '/api/guardian/missions') {
    return json(res, 200, { missions: guardianMissions.list() });
  }

  if (req.method === 'POST' && path === '/api/guardian/missions/milo-pilot') {
    const mission = await ensureMiloPilot();
    return json(res, 200, { mission });
  }

  if (req.method === 'POST' && path === '/api/guardian/missions') {
    const body = await bodyJson(req);
    try {
      let status = 200;
      let payload;
      let mutated = true;
      if (body.operation === 'create') { status = 201; payload = { mission: guardianMissions.create(body) }; }
      else if (body.operation === 'start') payload = { mission: guardianMissions.start(body.missionId) };
      else if (body.operation === 'evidence') payload = { evidence: guardianMissions.addEvidence(body.missionId, body.evidence || body) };
      else if (body.operation === 'criterion') payload = { criterion: guardianMissions.setCriterion(body.missionId, body.criterionId, body) };
      else if (body.operation === 'blocker') payload = { blocker: guardianMissions.reportBlocker(body.missionId, body) };
      else if (body.operation === 'resolve-blocker') payload = { blocker: guardianMissions.resolveBlocker(body.missionId, body.blockerId, body.note) };
      else if (body.operation === 'verify') payload = { verification: guardianMissions.verify(body.missionId, body) };
      else if (body.operation === 'accept') {
        if (!ownerRequired(req, res)) return;
        payload = { mission: guardianMissions.accept(body.missionId, { approved: body.approved === true, actor: 'owner' }) };
      } else if (body.operation === 'cancel') {
        if (!ownerRequired(req, res)) return;
        payload = { mission: guardianMissions.cancel(body.missionId, body.reason) };
      } else if (body.operation === 'get') {
        mutated = false;
        const mission = guardianMissions.get(body.missionId);
        if (!mission) return json(res, 404, { error: 'Mission not found' });
        payload = { mission };
      } else return json(res, 400, { error: 'Unknown mission operation' });
      if (mutated) await persistMissionState();
      return json(res, status, payload);
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }

  if (req.method === 'GET' && path === '/api/guardian/presence') {
    return json(res, 200, { activeSurfaces: guardianPresence.activeSurfaces() });
  }

  if (req.method === 'POST' && path === '/api/guardian/presence/enroll') {
    if (!ownerRequired(req, res)) return;
    const body = await bodyJson(req);
    try { return json(res, 201, { profile: guardianPresence.enroll(body) }); }
    catch (error) { return json(res, 400, { error: error.message }); }
  }

  if (req.method === 'POST' && path === '/api/guardian/presence/active') {
    if (!ownerRequired(req, res)) return;
    const body = await bodyJson(req);
    try { return json(res, 200, { profile: guardianPresence.setActive(body.deviceId, body.active) }); }
    catch (error) { return json(res, 400, { error: error.message }); }
  }

  if (req.method === 'POST' && path === '/api/guardian/presence/revoke') {
    if (!ownerRequired(req, res)) return;
    const body = await bodyJson(req);
    return json(res, 200, { revoked: guardianPresence.revoke(body.deviceId) });
  }

  return false;
}

export async function handleRequest(req, res) {
  try {
    if (String(req.url || '').startsWith('/api/guardian/execution')) {
      await ensureMissionStateLoaded();
      const handled = await guardianExecution.handle(req, res);
      if (handled !== false) return handled;
    }
    if (String(req.url || '').startsWith('/api/guardian/trust')) {
      const handled = await guardianTrust.handle(req, res);
      if (handled !== false) return handled;
    }
    if (String(req.url || '').startsWith('/api/guardian/runtime') ||
        String(req.url || '').startsWith('/api/guardian/missions') ||
        String(req.url || '').startsWith('/api/guardian/presence')) {
      const handled = await handleRuntimeApi(req, res);
      if (handled !== false) return handled;
    }
    return legacyHandleRequest(req, res);
  } catch (error) {
    return json(res, 500, { error: 'Guardian runtime error', detail: error.message });
  }
}

export const server = http.createServer(handleRequest);
export default server;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(port, '0.0.0.0', () => console.log(`STAARWAARDD Guardian Runtime ready at http://localhost:${port}`));
}
