import { randomUUID } from 'node:crypto';

function qualityTier(model) {
  const raw = Number(model?.metadata?.qualityTier ?? 3);
  return Number.isFinite(raw) ? Math.max(1, Math.min(5, raw)) : 3;
}

export class GuardianProviderOrchestrator {
  #router;
  #registry;
  #audit;
  #observability;
  #health = new Map();

  constructor({ router, registry, audit = null, observability = null } = {}) {
    if (!router || !registry) throw new Error('router and registry are required');
    this.#router = router;
    this.#registry = registry;
    this.#audit = audit;
    this.#observability = observability;
  }

  health() {
    return [...this.#health.entries()].map(([key, value]) => ({ key, ...structuredClone(value) }));
  }

  async execute({ task = 'general', input, instructions = null, requirePrivacy = null, maxCostTier = 5, maxLatencyTier = 5, minQualityTier = 1, preferredProvider = null, maxAttempts = 3, timeoutMs = 30000, maxOutputTokens = null } = {}) {
    if (!String(input || '').trim()) throw new Error('input is required');
    const executionId = `model-exec-${randomUUID()}`;
    const routed = this.#router.route({ task, requirePrivacy, maxCostTier, maxLatencyTier, preferredProvider });
    const candidates = routed.candidates
      .filter((model) => qualityTier(model) >= Number(minQualityTier || 1))
      .map((model) => ({ ...model, qualityTier: qualityTier(model) }))
      .sort((a, b) => {
        const aPreferred = preferredProvider && a.providerId === preferredProvider ? -20 : 0;
        const bPreferred = preferredProvider && b.providerId === preferredProvider ? -20 : 0;
        const aHealth = this.#health.get(a.key)?.state === 'DEGRADED' ? 20 : 0;
        const bHealth = this.#health.get(b.key)?.state === 'DEGRADED' ? 20 : 0;
        const aScore = aPreferred + aHealth + a.costTier * 2 + a.latencyTier * 2 - a.qualityTier * 3;
        const bScore = bPreferred + bHealth + b.costTier * 2 + b.latencyTier * 2 - b.qualityTier * 3;
        return aScore - bScore || a.key.localeCompare(b.key);
      });

    const attempts = [];
    const limit = Math.max(1, Math.min(Number(maxAttempts) || 3, 5));
    for (const model of candidates.slice(0, limit)) {
      const adapter = this.#registry.get(model.providerId);
      if (!adapter?.configured) {
        attempts.push({ providerId: model.providerId, modelId: model.modelId, ok: false, reason: 'PROVIDER_NOT_CONFIGURED' });
        continue;
      }
      const started = Date.now();
      try {
        this.#observability?.increment('provider.attempt', { provider: model.providerId, task });
        const result = await adapter.execute({ input, instructions, timeoutMs, maxOutputTokens });
        const latencyMs = Date.now() - started;
        this.#health.set(model.key, { state: 'HEALTHY', lastSuccessAt: new Date().toISOString(), latencyMs, failures: 0 });
        attempts.push({ providerId: model.providerId, modelId: model.modelId, ok: true, latencyMs });
        this.#audit?.append({ type: 'MODEL_PROVIDER_SUCCEEDED', executionId, providerId: model.providerId, modelId: model.modelId, task, latencyMs, costTier: model.costTier, qualityTier: model.qualityTier });
        this.#observability?.observe('provider.latency_ms', latencyMs, { provider: model.providerId, task });
        return { executionId, task, selected: model, result, attempts, failoverUsed: attempts.length > 1 };
      } catch (error) {
        const previous = this.#health.get(model.key) || { failures: 0 };
        const failures = Number(previous.failures || 0) + 1;
        this.#health.set(model.key, { state: 'DEGRADED', lastFailureAt: new Date().toISOString(), failures, error: String(error.message || error).slice(0, 400) });
        attempts.push({ providerId: model.providerId, modelId: model.modelId, ok: false, reason: String(error.message || error).slice(0, 400) });
        this.#audit?.append({ type: 'MODEL_PROVIDER_FAILED', executionId, providerId: model.providerId, modelId: model.modelId, task, error: String(error.message || error).slice(0, 400) });
        this.#observability?.increment('provider.failure', { provider: model.providerId, task });
      }
    }

    this.#audit?.append({ type: 'MODEL_EXECUTION_FAILED', executionId, task, attempts });
    return { executionId, task, selected: null, result: null, attempts, failoverUsed: attempts.length > 1, error: candidates.length ? 'ALL_ELIGIBLE_PROVIDERS_FAILED' : 'NO_ELIGIBLE_PROVIDER' };
  }
}
