import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { handleRequest as legacyHandleRequest } from './server.mjs';
import { guardianLedger, isOwnerTokenValid } from './guardian-core.mjs';
import { GuardianMissionEngine, createMiloAcceptancePilot } from './guardian-mission-engine.mjs';
import { GuardianPresenceRegistry } from './guardian-presence-contract.mjs';
import { createGuardianTrustRuntime } from './guardian-trust-runtime.mjs';

const port = Number(process.env.PORT || 3000);
export const guardianMissions = new GuardianMissionEngine({ audit: guardianLedger });
export const guardianPresence = new GuardianPresenceRegistry();
export const guardianTrust = createGuardianTrustRuntime({ audit: guardianLedger, ownerTokenValidator: isOwnerTokenValid });

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

function ensureMiloPilot() {
  const existing = guardianMissions.list().find((mission) => mission.metadata?.pilot === true && mission.title === 'Milo Episode Completion Pilot');
  return existing || createMiloAcceptancePilot(guardianMissions);
}

async function handleRuntimeApi(req, res) {
  const path = String(req.url || '/').split('?')[0];

  if (req.method === 'GET' && path === '/api/guardian/runtime') {
    return json(res, 200, {
      runtime: 'M4_TRUST_EXPANSION',
      hud: true,
      missionEngine: true,
      presenceRegistry: true,
      trustExpansion: true,
      sessionIdentity: true,
      connectorProvenance: true,
      memoryQuarantine: true,
      providerBoundary: true,
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
    const mission = ensureMiloPilot();
    return json(res, 200, { mission });
  }

  if (req.method === 'POST' && path === '/api/guardian/missions') {
    const body = await bodyJson(req);
    try {
      if (body.operation === 'create') return json(res, 201, { mission: guardianMissions.create(body) });
      if (body.operation === 'start') return json(res, 200, { mission: guardianMissions.start(body.missionId) });
      if (body.operation === 'evidence') return json(res, 200, { evidence: guardianMissions.addEvidence(body.missionId, body.evidence || body) });
      if (body.operation === 'criterion') return json(res, 200, { criterion: guardianMissions.setCriterion(body.missionId, body.criterionId, body) });
      if (body.operation === 'blocker') return json(res, 200, { blocker: guardianMissions.reportBlocker(body.missionId, body) });
      if (body.operation === 'resolve-blocker') return json(res, 200, { blocker: guardianMissions.resolveBlocker(body.missionId, body.blockerId, body.note) });
      if (body.operation === 'verify') return json(res, 200, { verification: guardianMissions.verify(body.missionId, body) });
      if (body.operation === 'accept') {
        if (!ownerRequired(req, res)) return;
        return json(res, 200, { mission: guardianMissions.accept(body.missionId, { approved: body.approved === true, actor: 'owner' }) });
      }
      if (body.operation === 'cancel') {
        if (!ownerRequired(req, res)) return;
        return json(res, 200, { mission: guardianMissions.cancel(body.missionId, body.reason) });
      }
      if (body.operation === 'get') {
        const mission = guardianMissions.get(body.missionId);
        return mission ? json(res, 200, { mission }) : json(res, 404, { error: 'Mission not found' });
      }
      return json(res, 400, { error: 'Unknown mission operation' });
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
