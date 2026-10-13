import { GuardianSessionRegistry } from './guardian-session-identity.mjs';
import { ConnectorProvenanceRegistry } from './guardian-connector-provenance.mjs';
import { GuardianMemoryQuarantine } from './guardian-memory-quarantine.mjs';
import { buildProviderBoundary, validateClientConversationInput } from './guardian-provider-boundary.mjs';
import { safeRenderModelText } from './guardian-safe-render.mjs';

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
        runtime: 'M4_TRUST_EXPANSION',
        authenticatedSessions: sessions.list().length,
        registeredConnectors: connectors.list().length,
        quarantinedMemoryItems: memory.list({ state: 'QUARANTINED' }).length,
        guarantees: {
          externalContentIsInstructionAuthority: false,
          memoryWritesRequireReview: true,
          providerRolesAreServerControlled: true,
          rawHtmlRenderingAllowed: false
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
        return json(res, 200, {
          memory: memory.review(body.memoryId, {
            decision: body.decision,
            ownerAuthenticated: true,
            explicitApproval: body.explicitApproval === true,
            note: body.note
          })
        });
      } catch (error) {
        return json(res, 400, { error: error.message });
      }
    }

    if (req.method === 'GET' && path === '/api/guardian/trust/memory') {
      if (!requireAuth(req, res, 'strong')) return true;
      return json(res, 200, { memory: memory.list() });
    }

    if (req.method === 'POST' && path === '/api/guardian/trust/provider/validate') {
      const body = await bodyJson(req);
      return json(res, 200, body.externalData
        ? buildProviderBoundary({ clientInput: body.clientInput, externalData: body.externalData })
        : validateClientConversationInput(body.clientInput));
    }

    if (req.method === 'POST' && path === '/api/guardian/trust/render') {
      const body = await bodyJson(req);
      return json(res, 200, safeRenderModelText(body.text));
    }

    return false;
  }

  return { sessions, connectors, memory, authentication, handle };
}
