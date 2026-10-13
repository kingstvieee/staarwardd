import { safeRenderModelText } from './guardian-safe-render.mjs';

function timeoutSignal(timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(250, Math.min(Number(timeoutMs) || 30000, 120000)));
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

async function readJson(response) {
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : {}; }
  catch { body = { raw: text.slice(0, 2000) }; }
  if (!response.ok) {
    const message = body?.error?.message || body?.message || `Provider HTTP ${response.status}`;
    const error = new Error(String(message).slice(0, 800));
    error.status = response.status;
    throw error;
  }
  return body;
}

function normalizeTextResult(providerId, modelId, text, rawMeta = {}) {
  const rendered = safeRenderModelText(String(text || ''));
  return {
    providerId,
    modelId,
    text: rendered.text,
    rendering: rendered.renderingContract,
    safetyInspection: rendered.inspection,
    rawMeta: structuredClone(rawMeta)
  };
}

function extractOpenAIText(body) {
  if (typeof body?.output_text === 'string') return body.output_text;
  const parts = [];
  for (const item of body?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === 'string') parts.push(content.text);
    }
  }
  return parts.join('\n');
}

function extractAnthropicText(body) {
  return (body?.content || []).filter((item) => item?.type === 'text' && typeof item?.text === 'string').map((item) => item.text).join('\n');
}

function extractGeminiText(body) {
  const parts = [];
  for (const candidate of body?.candidates || []) {
    for (const part of candidate?.content?.parts || []) if (typeof part?.text === 'string') parts.push(part.text);
  }
  return parts.join('\n');
}

export class GuardianProviderAdapterRegistry {
  #adapters = new Map();

  register(adapter) {
    if (!adapter?.providerId || typeof adapter.execute !== 'function') throw new Error('Provider adapter requires providerId and execute');
    this.#adapters.set(String(adapter.providerId), adapter);
    return this.describe(String(adapter.providerId));
  }

  get(providerId) { return this.#adapters.get(String(providerId)) || null; }

  describe(providerId) {
    const adapter = this.get(providerId);
    if (!adapter) return null;
    return {
      providerId: adapter.providerId,
      configured: Boolean(adapter.configured),
      endpoint: adapter.endpoint,
      modelId: adapter.modelId || null,
      kind: adapter.kind || 'model-provider'
    };
  }

  list() { return [...this.#adapters.keys()].map((id) => this.describe(id)); }
}

export function createOpenAIResponsesAdapter({ apiKey = process.env.OPENAI_API_KEY, modelId = process.env.OPENAI_MODEL, endpoint = 'https://api.openai.com/v1/responses', fetchImpl = fetch } = {}) {
  return {
    providerId: 'openai', kind: 'responses-api', endpoint, modelId: modelId || null, configured: Boolean(apiKey && modelId),
    async execute({ input, instructions = null, timeoutMs = 30000, maxOutputTokens = null } = {}) {
      if (!apiKey || !modelId) throw new Error('OpenAI provider is not configured');
      const timer = timeoutSignal(timeoutMs);
      try {
        const payload = { model: modelId, input: String(input || '') };
        if (instructions) payload.instructions = String(instructions);
        if (Number.isFinite(maxOutputTokens)) payload.max_output_tokens = Number(maxOutputTokens);
        const response = await fetchImpl(endpoint, {
          method: 'POST', signal: timer.signal,
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const body = await readJson(response);
        return normalizeTextResult('openai', modelId, extractOpenAIText(body), { id: body?.id || null, status: body?.status || null, usage: body?.usage || null });
      } finally { timer.clear(); }
    }
  };
}

export function createAnthropicMessagesAdapter({ apiKey = process.env.ANTHROPIC_API_KEY, modelId = process.env.ANTHROPIC_MODEL, endpoint = 'https://api.anthropic.com/v1/messages', fetchImpl = fetch } = {}) {
  return {
    providerId: 'anthropic', kind: 'messages-api', endpoint, modelId: modelId || null, configured: Boolean(apiKey && modelId),
    async execute({ input, instructions = null, timeoutMs = 30000, maxOutputTokens = 1024 } = {}) {
      if (!apiKey || !modelId) throw new Error('Anthropic provider is not configured');
      const timer = timeoutSignal(timeoutMs);
      try {
        const payload = { model: modelId, max_tokens: Math.max(1, Number(maxOutputTokens) || 1024), messages: [{ role: 'user', content: String(input || '') }] };
        if (instructions) payload.system = String(instructions);
        const response = await fetchImpl(endpoint, {
          method: 'POST', signal: timer.signal,
          headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const body = await readJson(response);
        return normalizeTextResult('anthropic', modelId, extractAnthropicText(body), { id: body?.id || null, stopReason: body?.stop_reason || null, usage: body?.usage || null });
      } finally { timer.clear(); }
    }
  };
}

export function createGeminiGenerateContentAdapter({ apiKey = process.env.GEMINI_API_KEY, modelId = process.env.GEMINI_MODEL, endpointBase = 'https://generativelanguage.googleapis.com/v1beta/models', fetchImpl = fetch } = {}) {
  const endpoint = modelId ? `${endpointBase}/${encodeURIComponent(modelId)}:generateContent` : endpointBase;
  return {
    providerId: 'gemini', kind: 'generate-content-api', endpoint, modelId: modelId || null, configured: Boolean(apiKey && modelId),
    async execute({ input, instructions = null, timeoutMs = 30000 } = {}) {
      if (!apiKey || !modelId) throw new Error('Gemini provider is not configured');
      const timer = timeoutSignal(timeoutMs);
      try {
        const payload = { contents: [{ role: 'user', parts: [{ text: String(input || '') }] }] };
        if (instructions) payload.systemInstruction = { parts: [{ text: String(instructions) }] };
        const response = await fetchImpl(`${endpointBase}/${encodeURIComponent(modelId)}:generateContent`, {
          method: 'POST', signal: timer.signal,
          headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const body = await readJson(response);
        return normalizeTextResult('gemini', modelId, extractGeminiText(body), { usage: body?.usageMetadata || null, finishReasons: (body?.candidates || []).map((c) => c?.finishReason).filter(Boolean) });
      } finally { timer.clear(); }
    }
  };
}

export function createSandboxProviderAdapter({ providerId = 'sandbox', modelId = 'deterministic-sandbox' } = {}) {
  return {
    providerId, kind: 'sandbox', endpoint: 'local://sandbox', modelId, configured: true,
    async execute({ input } = {}) {
      return normalizeTextResult(providerId, modelId, `SANDBOX: ${String(input || '')}`, { sandbox: true });
    }
  };
}

export function createDefaultProviderRegistry(options = {}) {
  const registry = new GuardianProviderAdapterRegistry();
  registry.register(createSandboxProviderAdapter());
  registry.register(createOpenAIResponsesAdapter(options.openai || {}));
  registry.register(createAnthropicMessagesAdapter(options.anthropic || {}));
  registry.register(createGeminiGenerateContentAdapter(options.gemini || {}));
  return registry;
}
