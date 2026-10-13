import { GuardianSessionRegistry } from './guardian-session-identity.mjs';
import { ConnectorProvenanceRegistry } from './guardian-connector-provenance.mjs';
import { GuardianMemoryQuarantine } from './guardian-memory-quarantine.mjs';
import { buildProviderBoundary, validateClientConversationInput } from './guardian-provider-boundary.mjs';
import { safeRenderModelText } from './guardian-safe-render.mjs';
import { GuardianDurableIdentityStore } from './guardian-durable-identity.mjs';
import { GuardianDeviceRevocationRegistry } from './guardian-device-revocation.mjs';
import { ConnectorAttestationAuthority } from './guardian-connector-attestation.mjs';
import { EncryptedMemoryStore } from './guardian-encrypted-memory-store.mjs';
import { GuardianModelRouter } from './guardian-model-router.mjs';
import { GuardianIsolatedActionExecutor } from './guardian-isolated-action-executor.mjs';
import { GuardianSecurityEvidenceRegistry } from './guardian-security-evidence.mjs';

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

export function createGuardianTrustRuntime({ audit = null, ownerTokenValidator = () => false } = {}) {
  const sessions = new GuardianSessionRegistry({ audit });
  const connectors = new ConnectorProvenanceRegistry({ audit });
  const memory = new GuardianMemoryQuarantine({ audit });
  const durableIdentity = new GuardianDurableIdentityStore({ audit, filePath: process.env.STAARWAARDD_IDENTITY_STORE || '.guardian/identities.json' });
  const devices = new GuardianDeviceRevocationRegistry({ audit });
  const models = new GuardianModelRouter();
  const securityEvidence = new GuardianSecurityEvidenceRegistry({ audit });
  const attestationSecret = process.env.STAARWAARDD_CONNECTOR_ATTESTATION_SECRET || null;
  const memorySecret = process.env.STAARWAARDD_MEMORY_ENCRYPTION_SECRET || null;
  const attestations = attestationSecret ? new ConnectorAttestationAuthority({ secret: attestationSecret }) : null;
  const encryptedMemory = memorySecret ? new EncryptedMemoryStore({ secret: memorySecret, filePath: process.env.STAARWAARDD_ENCRYPTED_MEMORY_STORE || '.guardian/memory.enc.json' }) : null;
  let identityLoaded = false;
  let encryptedMemoryLoaded = false;

  const actions = new GuardianIsolatedActionExecutor({
    audit,
    authorize: ({ risk, approval, ownerAuthenticated }) => {
      if (!ownerAuthenticated) return { allowed: false, reason: 'OWNER_AUTH_REQUIRED' };
      if (risk === 'red') return { allowed: false, reason: 'RED_RISK_REQUIRES_SEPARATE_WORKFLOW' };
      if (!approval) return { allowed: false, reason: 'EXPLICIT_APPROVAL_REQUIRED' };
      return { allowed: true, reason: 'AUTHORIZED_BY_M5_BOUNDARY' };
    }
  });

  async function ensureIdentityLoaded() {
    if (!identityLoaded) { await durableIdentity.load(); identityLoaded = true; }
  }
  async function ensureEncryptedMemoryLoaded() {
    if (!encryptedMemory) throw new Error('Encrypted memory is not configured');
    if (!encryptedMemoryLoaded) { await encryptedMemory.load(); encryptedMemoryLoaded = true; }
  }

  function authentication(req, requiredAssurance = 'basic') {
    const authorization = req.headers.authorization;
    if (ownerTokenValidator(authorization)) return { authenticated: true, bootstrapOwner: true, assurance: 'strong', subject: 'owner' };
    const session = sessions.authenticate(authorization, { requiredAssurance, subject: 'owner' });
    return session.authenticated ? { ...session, bootstrapOwner: false } : session;
  }

  function requireAuth(req, res, requiredAssurance = 'basic') {
    const auth = authentication(req, requiredAssurance);
    if (auth.authenticated) return auth;
    json(res, 401, { error: 'Authenticated Guardian owner session required', reason: auth.reason || 'UNAUTHENTICATED' });
    return null;
  }

  async function handle(req, res) {
    const path = String(req.url || '/').split('?')[0];

    if (req.method === 'GET' && path === '/api/guardian/trust/runtime') {
      return json(res, 200, {
        runtime: 'M5_PRODUCTION_TRUST',
        authenticatedSessions: sessions.list().length,
        registeredConnectors: connectors.list().length,
        quarantinedMemoryItems: memory.list({ state: 'QUARANTINED' }).length,
        registeredModels: models.list().length,
        enrolledDevices: devices.list().length,
        encryptedMemoryConfigured: Boolean(encryptedMemory),
        connectorAttestationConfigured: Boolean(attestations),
        guarantees: {
          externalContentIsInstructionAuthority: false,
          memoryWritesRequireReview: true,
          providerRolesAreServerControlled: true,
          rawHtmlRenderingAllowed: false,
          modelRoutingIsProviderNeutral: true,
          externalActionsUseIsolatedExecutor: true,
          durableIdentitySupported: true,
          connectorAttestationsAreSignedWhenConfigured: true
        }
      });
    }

    if (req.method === 'POST' && path === '/api/guardian/trust/session') {
      const body = await bodyJson(req);
      if (body.operation === 'issue') {
        if (!requireAuth(req, res, 'strong')) return true;
        try { return json(res, 201, sessions.issue(body)); }
        catch (error) { return json(res, 400, { error: error.message }); }
      }
      if (body.operation === 'revoke') {
        if (!requireAuth(req, res, 'strong')) return true;
        return json(res, 200, sessions.revoke(body.sessionId));
      }
      if (body.operation === 'list') {
        if (!requireAuth(req, res, 'strong')) return true;
        return json(res, 200, { sessions: sessions.list() });
      }
      return json(res, 400, { error: 'Unknown session operation' });
    }

    if (req.method === 'POST' && path === '/api/guardian/trust/identity') {
      if (!requireAuth(req, res, 'strong')) return true;
      const body = await bodyJson(req);
      try {
        await ensureIdentityLoaded();
        if (body.operation === 'enroll') return json(res, 201, { identity: await durableIdentity.enroll(body) });
        if (body.operation === 'revoke') return json(res, 200, await durableIdentity.revoke(body.deviceId, body.reason));
        if (body.operation === 'list') return json(res, 200, { identities: durableIdentity.list() });
        return json(res, 400, { error: 'Unknown identity operation' });
      } catch (error) { return json(res, 400, { error: error.message }); }
    }

    if (req.method === 'POST' && path === '/api/guardian/trust/device') {
      if (!requireAuth(req, res, 'strong')) return true;
      const body = await bodyJson(req);
      try {
        if (body.operation === 'enroll') return json(res, 201, { device: devices.enroll(body) });
        if (body.operation === 'revoke') return json(res, 200, devices.revoke(body.deviceId, body.reason));
        if (body.operation === 'revoke-all') return json(res, 200, devices.revokeAll(body.reason));
        if (body.operation === 'list') return json(res, 200, { devices: devices.list() });
        return json(res, 400, { error: 'Unknown device operation' });
      } catch (error) { return json(res, 400, { error: error.message }); }
    }

    if (req.method === 'POST' && path === '/api/guardian/trust/connector/register') {
      if (!requireAuth(req, res, 'strong')) return true;
      const body = await bodyJson(req);
      try { return json(res, 201, { connector: connectors.register(body) }); }
      catch (error) { return json(res, 400, { error: error.message }); }
    }

    if (req.method === 'POST' && path === '/api/guardian/trust/connector/wrap') {
      if (!requireAuth(req, res, 'basic')) return true;
      const body = await bodyJson(req);
      try { return json(res, 200, connectors.wrap(body)); }
      catch (error) { return json(res, 400, { error: error.message }); }
    }

    if (req.method === 'GET' && path === '/api/guardian/trust/connectors') {
      if (!requireAuth(req, res, 'strong')) return true;
      return json(res, 200, { connectors: connectors.list() });
    }

    if (req.method === 'POST' && path === '/api/guardian/trust/attestation') {
      if (!requireAuth(req, res, 'strong')) return true;
      if (!attestations) return json(res, 503, { error: 'Connector attestation is not configured' });
      const body = await bodyJson(req);
      try {
        if (body.operation === 'issue') return json(res, 201, { attestation: attestations.issue(body) });
        if (body.operation === 'verify') return json(res, 200, attestations.verify(body.attestation, body.constraints || {}));
        return json(res, 400, { error: 'Unknown attestation operation' });
      } catch (error) { return json(res, 400, { error: error.message }); }
    }

    if (req.method === 'POST' && path === '/api/guardian/trust/memory/propose') {
      if (!requireAuth(req, res, 'basic')) return true;
      const body = await bodyJson(req);
      try { return json(res, 201, { memory: memory.propose(body) }); }
      catch (error) { return json(res, 400, { error: error.message }); }
    }

    if (req.method === 'POST' && path === '/api/guardian/trust/memory/review') {
      if (!requireAuth(req, res, 'strong')) return true;
      const body = await bodyJson(req);
      try {
        return json(res, 200, { memory: memory.review(body.memoryId, { decision: body.decision, ownerAuthenticated: true, explicitApproval: body.explicitApproval === true, note: body.note }) });
      } catch (error) { return json(res, 400, { error: error.message }); }
    }

    if (req.method === 'GET' && path === '/api/guardian/trust/memory') {
      if (!requireAuth(req, res, 'strong')) return true;
      return json(res, 200, { memory: memory.list() });
    }

    if (req.method === 'POST' && path === '/api/guardian/trust/encrypted-memory') {
      if (!requireAuth(req, res, 'strong')) return true;
      const body = await bodyJson(req);
      try {
        await ensureEncryptedMemoryLoaded();
        if (body.operation === 'put') return json(res, 201, { memory: await encryptedMemory.put(body) });
        if (body.operation === 'delete') return json(res, 200, await encryptedMemory.delete(body.memoryId));
        if (body.operation === 'get') return json(res, 200, { memory: encryptedMemory.get(body.memoryId) });
        if (body.operation === 'list') return json(res, 200, { memory: encryptedMemory.list() });
        return json(res, 400, { error: 'Unknown encrypted-memory operation' });
      } catch (error) { return json(res, 400, { error: error.message }); }
    }

    if (req.method === 'POST' && path === '/api/guardian/trust/model') {
      const body = await bodyJson(req);
      if (body.operation === 'register') {
        if (!requireAuth(req, res, 'strong')) return true;
        try { return json(res, 201, { model: models.register(body) }); }
        catch (error) { return json(res, 400, { error: error.message }); }
      }
      if (body.operation === 'route') {
        if (!requireAuth(req, res, 'basic')) return true;
        try { return json(res, 200, models.route(body)); }
        catch (error) { return json(res, 400, { error: error.message }); }
      }
      return json(res, 400, { error: 'Unknown model operation' });
    }

    if (req.method === 'POST' && path === '/api/guardian/trust/action') {
      const auth = requireAuth(req, res, 'strong');
      if (!auth) return true;
      const body = await bodyJson(req);
      try { return json(res, 200, await actions.request({ ...body, ownerAuthenticated: true })); }
      catch (error) { return json(res, 400, { error: error.message }); }
    }

    if (req.method === 'POST' && path === '/api/guardian/trust/security/evidence') {
      if (!requireAuth(req, res, 'strong')) return true;
      const body = await bodyJson(req);
      try { return json(res, 201, { evidence: securityEvidence.record(body) }); }
      catch (error) { return json(res, 400, { error: error.message }); }
    }

    if (req.method === 'GET' && path === '/api/guardian/trust/security/evidence') {
      if (!requireAuth(req, res, 'strong')) return true;
      return json(res, 200, securityEvidence.summary());
    }

    if (req.method === 'POST' && path === '/api/guardian/trust/provider/validate') {
      const body = await bodyJson(req);
      return json(res, 200, body.externalData ? buildProviderBoundary({ clientInput: body.clientInput, externalData: body.externalData }) : validateClientConversationInput(body.clientInput));
    }

    if (req.method === 'POST' && path === '/api/guardian/trust/render') {
      const body = await bodyJson(req);
      return json(res, 200, safeRenderModelText(body.text));
    }

    return false;
  }

  return { sessions, connectors, memory, durableIdentity, devices, models, actions, securityEvidence, attestations, encryptedMemory, authentication, handle };
}
