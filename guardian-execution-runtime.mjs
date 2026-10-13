import { createDefaultProviderRegistry } from './guardian-provider-adapters.mjs';
import { GuardianProviderOrchestrator } from './guardian-provider-orchestrator.mjs';
import { GuardianObservability } from './guardian-observability.mjs';
import { GuardianSignedShutdownAuthority } from './guardian-signed-shutdown.mjs';
import { registerGuardianStagingAdapters } from './guardian-staging-action-adapters.mjs';

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

function parseCapabilities(value, fallback = ['general']) {
  const list = String(value || '').split(',').map((x) => x.trim()).filter(Boolean);
  return list.length ? list : fallback;
}

export function createGuardianExecutionRuntime({ trust, missions, audit = null, auditFanout = null } = {}) {
  if (!trust?.models || !trust?.actions || !trust?.authentication) throw new Error('M5 trust runtime is required');
  if (!missions) throw new Error('Mission engine is required');

  const observability = new GuardianObservability();
  const providers = createDefaultProviderRegistry();
  const orchestrator = new GuardianProviderOrchestrator({ router: trust.models, registry: providers, audit, observability });
  const shutdownSecret = process.env.STAARWAARDD_SHUTDOWN_SIGNING_SECRET || null;
  const shutdown = shutdownSecret ? new GuardianSignedShutdownAuthority({ secret: shutdownSecret, audit }) : null;

  trust.actions.setLockdownCheck(() => shutdown?.state === 'LOCKDOWN');
  registerGuardianStagingAdapters(trust.actions);

  const registrations = [
    { providerId: 'sandbox', modelId: 'deterministic-sandbox', capabilities: ['general','fast'], privacy: 'local', costTier: 1, latencyTier: 1, enabled: true, metadata: { qualityTier: 1, staging: true } },
    { providerId: 'openai', modelId: process.env.OPENAI_MODEL, capabilities: parseCapabilities(process.env.OPENAI_CAPABILITIES), privacy: 'cloud', costTier: Number(process.env.OPENAI_COST_TIER || 3), latencyTier: Number(process.env.OPENAI_LATENCY_TIER || 2), enabled: providers.get('openai')?.configured, metadata: { qualityTier: Number(process.env.OPENAI_QUALITY_TIER || 4) } },
    { providerId: 'anthropic', modelId: process.env.ANTHROPIC_MODEL, capabilities: parseCapabilities(process.env.ANTHROPIC_CAPABILITIES), privacy: 'cloud', costTier: Number(process.env.ANTHROPIC_COST_TIER || 3), latencyTier: Number(process.env.ANTHROPIC_LATENCY_TIER || 2), enabled: providers.get('anthropic')?.configured, metadata: { qualityTier: Number(process.env.ANTHROPIC_QUALITY_TIER || 4) } },
    { providerId: 'gemini', modelId: process.env.GEMINI_MODEL, capabilities: parseCapabilities(process.env.GEMINI_CAPABILITIES), privacy: 'cloud', costTier: Number(process.env.GEMINI_COST_TIER || 2), latencyTier: Number(process.env.GEMINI_LATENCY_TIER || 2), enabled: providers.get('gemini')?.configured, metadata: { qualityTier: Number(process.env.GEMINI_QUALITY_TIER || 4) } }
  ];
  for (const item of registrations) {
    if (!item.modelId) continue;
    try { trust.models.register(item); } catch {}
  }

  function auth(req, required = 'basic') { return trust.authentication(req, required); }
  function requireAuth(req, res, required = 'basic') {
    const result = auth(req, required);
    if (result.authenticated) return result;
    json(res, 401, { error: 'Authenticated Guardian owner session required', reason: result.reason || 'UNAUTHENTICATED' });
    return null;
  }

  function miloReadiness() {
    const mission = missions.list().find((item) => item.metadata?.pilot === true && item.title === 'Milo Episode Completion Pilot') || null;
    const configuredProviders = providers.list().filter((p) => p.configured && p.providerId !== 'sandbox');
    return {
      mission,
      liveProviderConfigured: configuredProviders.length > 0,
      configuredProviders,
      shutdownConfigured: Boolean(shutdown),
      stagingActionAdapters: trust.actions.listAdapters(),
      readyForControlledLiveRun: Boolean(mission && configuredProviders.length > 0 && shutdown),
      completionStillRequiresEvidenceAndOwnerAcceptance: true
    };
  }

  async function handle(req, res) {
    const path = String(req.url || '/').split('?')[0];

    if (req.method === 'GET' && path === '/api/guardian/execution/runtime') {
      return json(res, 200, {
        runtime: 'M6_PRODUCTION_EXECUTION',
        providers: providers.list(),
        providerHealth: orchestrator.health(),
        shutdownConfigured: Boolean(shutdown),
        shutdownState: shutdown?.state || 'UNCONFIGURED',
        actionAdapters: trust.actions.listAdapters(),
        remoteAuditConfigured: Boolean(auditFanout?.remote?.configured),
        remoteAuditPending: auditFanout?.remote?.pendingCount || 0,
        guarantees: {
          providerFailover: true,
          costQualityRouting: true,
          rawProviderToolsAuthorized: false,
          actionDryRunDefault: true,
          signedLockdownWhenConfigured: true,
          promptContentExcludedFromObservability: true
        }
      });
    }

    if (req.method === 'POST' && path === '/api/guardian/execution/model') {
      if (!requireAuth(req, res, 'basic')) return true;
      const body = await bodyJson(req);
      observability.increment('model.execution.request', { task: body.task || 'general' });
      try {
        const result = await orchestrator.execute(body);
        observability.event('model.execution.completed', { task: body.task || 'general', provider: result.selected?.providerId || 'none', failover: Boolean(result.failoverUsed) });
        return json(res, result.result ? 200 : 503, result);
      } catch (error) {
        observability.increment('model.execution.error');
        return json(res, 400, { error: String(error.message || error) });
      }
    }

    if (req.method === 'POST' && path === '/api/guardian/execution/action') {
      if (!requireAuth(req, res, 'strong')) return true;
      const body = await bodyJson(req);
      try {
        const result = await trust.actions.request({ ...body, ownerAuthenticated: true, dryRun: body.dryRun !== false });
        observability.increment('action.request', { adapter: body.adapterId || 'unknown', outcome: result.executed ? 'executed' : result.reason || 'preview' });
        return json(res, 200, result);
      } catch (error) { return json(res, 400, { error: String(error.message || error) }); }
    }

    if (req.method === 'POST' && path === '/api/guardian/execution/shutdown') {
      if (!requireAuth(req, res, 'strong')) return true;
      if (!shutdown) return json(res, 503, { error: 'Signed shutdown is not configured' });
      const body = await bodyJson(req);
      try {
        if (body.operation === 'issue') return json(res, 201, { command: shutdown.issue(body.command || body) });
        if (body.operation === 'apply') return json(res, 200, shutdown.apply(body.command));
        if (body.operation === 'status') return json(res, 200, { state: shutdown.state });
        return json(res, 400, { error: 'Unknown shutdown operation' });
      } catch (error) { return json(res, 400, { error: String(error.message || error) }); }
    }

    if (req.method === 'POST' && path === '/api/guardian/execution/audit/flush') {
      if (!requireAuth(req, res, 'strong')) return true;
      if (!auditFanout?.flushRemote) return json(res, 503, { error: 'Remote audit fanout unavailable' });
      try { return json(res, 200, await auditFanout.flushRemote()); }
      catch (error) { return json(res, 502, { error: String(error.message || error) }); }
    }

    if (req.method === 'GET' && path === '/api/guardian/execution/observability') {
      if (!requireAuth(req, res, 'strong')) return true;
      return json(res, 200, observability.snapshot());
    }

    if (req.method === 'GET' && path === '/api/guardian/execution/milo') {
      if (!requireAuth(req, res, 'basic')) return true;
      return json(res, 200, miloReadiness());
    }

    return false;
  }

  return { providers, orchestrator, observability, shutdown, miloReadiness, handle };
}
