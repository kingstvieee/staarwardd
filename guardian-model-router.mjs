export const MODEL_TASKS = Object.freeze(['general','reasoning','vision','audio','code','creative','fast']);

function normalizedCapabilities(value = []) {
  return [...new Set(value.map(String).filter(Boolean))].sort();
}

export class GuardianModelRouter {
  #providers = new Map();

  register({ providerId, modelId, capabilities = ['general'], privacy = 'cloud', costTier = 2, latencyTier = 2, enabled = true, metadata = {} } = {}) {
    if (!providerId || !modelId) throw new Error('providerId and modelId are required');
    const key = `${providerId}:${modelId}`;
    const record = {
      key,
      providerId: String(providerId),
      modelId: String(modelId),
      capabilities: normalizedCapabilities(capabilities),
      privacy: String(privacy),
      costTier: Number(costTier),
      latencyTier: Number(latencyTier),
      enabled: Boolean(enabled),
      metadata: structuredClone(metadata)
    };
    if (![1,2,3,4,5].includes(record.costTier) || ![1,2,3,4,5].includes(record.latencyTier)) throw new Error('costTier and latencyTier must be 1-5');
    this.#providers.set(key, record);
    return structuredClone(record);
  }

  list() { return [...this.#providers.values()].map((item) => structuredClone(item)); }

  route({ task = 'general', requirePrivacy = null, maxCostTier = 5, maxLatencyTier = 5, preferredProvider = null } = {}) {
    if (!MODEL_TASKS.includes(task)) throw new Error('Unsupported task class');
    const candidates = [...this.#providers.values()].filter((model) =>
      model.enabled &&
      (model.capabilities.includes(task) || model.capabilities.includes('general')) &&
      model.costTier <= maxCostTier &&
      model.latencyTier <= maxLatencyTier &&
      (!requirePrivacy || model.privacy === requirePrivacy)
    );
    candidates.sort((a, b) => {
      const ap = preferredProvider && a.providerId === preferredProvider ? -10 : 0;
      const bp = preferredProvider && b.providerId === preferredProvider ? -10 : 0;
      return (ap + a.costTier + a.latencyTier) - (bp + b.costTier + b.latencyTier) || a.key.localeCompare(b.key);
    });
    const selected = candidates[0] || null;
    return {
      task,
      selected: selected ? structuredClone(selected) : null,
      candidates: candidates.map((item) => structuredClone(item)),
      executable: false,
      reason: selected ? 'Route selected. Provider execution remains behind the isolated action boundary.' : 'No provider satisfies the requested constraints.'
    };
  }
}
