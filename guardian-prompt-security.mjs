import { createHash } from 'node:crypto';

export const PROMPT_SECURITY_REGIME_VERSION = 'guardian-prompt-security-v1';

export const PROMPT_SOURCE_TRUST = Object.freeze({
  system: 'TRUSTED_INSTRUCTION',
  developer: 'TRUSTED_INSTRUCTION',
  owner: 'USER_INSTRUCTION',
  user: 'USER_INSTRUCTION',
  web: 'UNTRUSTED_DATA',
  file: 'UNTRUSTED_DATA',
  retrieval: 'UNTRUSTED_DATA',
  connector: 'UNTRUSTED_DATA',
  plugin: 'UNTRUSTED_DATA',
  tool: 'UNTRUSTED_DATA',
  email: 'UNTRUSTED_DATA',
  document: 'UNTRUSTED_DATA',
  unknown: 'UNTRUSTED_DATA'
});

const ZERO_WIDTH_OR_BIDI = /[\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g;
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const BASE64_TOKEN = /(?:^|\s)([A-Za-z0-9+/]{20,}={0,2})(?=\s|$)/g;
const URL_ENCODED = /%(?:[0-9A-Fa-f]{2})/;

const SIGNALS = Object.freeze([
  {
    id: 'authority_override',
    weight: 4,
    test: /\b(ignore|forget|disregard|override|replace)\b.{0,60}\b(previous|prior|system|developer|rules?|instructions?|policy|policies)\b|\b(i am|i'm|act as)\b.{0,40}\b(developer|system|administrator|root|owner)\b/i
  },
  {
    id: 'prompt_exfiltration',
    weight: 5,
    test: /\b(reveal|show|print|dump|repeat|summari[sz]e|quote|expose)\b.{0,80}\b(system prompt|developer prompt|hidden instructions?|internal instructions?|secret prompt|api key|access token|private key)\b/i
  },
  {
    id: 'persona_jailbreak',
    weight: 4,
    test: /\b(DAN|developer mode|opposite mode|evil\s*gpt|unrestricted persona|no restrictions?|without restrictions?)\b/i
  },
  {
    id: 'instruction_smuggling',
    weight: 3,
    test: /\b(secret mission|do not mention|don't mention|silently execute|hidden instruction|follow these instructions next turn|never mention it)\b/i
  },
  {
    id: 'payload_assembly',
    weight: 3,
    test: /\b(concatenate|combine|join|assemble)\b.{0,80}\b(parts?|fragments?|variables?|strings?|payload|instructions?)\b|\b(a\s*=|b\s*=|payload\s*=).{0,120}(combine|concat|join|decode|reverse)/i
  },
  {
    id: 'encoded_instruction',
    weight: 2,
    test: /\b(base64|hex(?:adecimal)?|morse|rot13|cipher|url[- ]?decode|decode this|encoded prompt)\b/i
  },
  {
    id: 'tool_execution_directive',
    weight: 4,
    test: /\b(run|execute|launch|invoke|call|open terminal|shell)\b.{0,80}\b(command|script|tool|terminal|powershell|bash|cmd|curl|wget|exec|spawn)\b/i
  },
  {
    id: 'memory_persistence_directive',
    weight: 5,
    test: /\b(memory|remember|persist|save this for future|store this)\b.{0,100}\b(always|secret|instruction|exfiltrat|ignore|override|system|developer)\b/i
  },
  {
    id: 'raw_provider_object',
    weight: 5,
    test: /"(?:role|reasoning|encrypted_content|thinking|redacted_thinking|tool_calls?|tool_results?|system|developer)"\s*:/i
  },
  {
    id: 'hidden_markup',
    weight: 4,
    test: /<!--[^>]*(?:ignore|instruction|assistant|developer|system|execute)[\s\S]*?-->|(?:display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0|font-size\s*:\s*0|left\s*:\s*-\d{3,}px)/i
  },
  {
    id: 'streaming_exfil_markup',
    weight: 5,
    test: /<(?:img|iframe|link|meta)\b[^>]*(?:src|href|http-equiv)\s*=|!\[[^\]]*\]\(https?:\/\//i
  },
  {
    id: 'prompt_in_url_parameter',
    weight: 4,
    test: /https?:\/\/[^\s?#]+(?:\?[^#\s]*)?(?:[?&](?:q|query|prompt|message|input)=)[^\s#]+/i
  }
]);

const PRIVILEGED_KEYS = new Set([
  'system', 'developer', 'reasoning', 'encrypted_content', 'thinking', 'redacted_thinking',
  'tool_call', 'tool_calls', 'tool_result', 'tool_results', 'function_call', 'function_calls'
]);

function hash(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function boundedString(value, max = 20000) {
  return String(value ?? '').slice(0, max);
}

export function normalizePromptSecurityText(value) {
  return boundedString(value)
    .normalize('NFKC')
    .replace(ZERO_WIDTH_OR_BIDI, '')
    .replace(CONTROL_CHARS, '')
    .replace(/[\t ]+/g, ' ')
    .replace(/\r\n/g, '\n');
}

function decodePercentOnce(text) {
  if (!URL_ENCODED.test(text)) return null;
  try {
    const decoded = decodeURIComponent(text);
    return decoded === text ? null : normalizePromptSecurityText(decoded);
  } catch {
    return null;
  }
}

function decodeBase64Candidates(text) {
  const decoded = [];
  for (const match of text.matchAll(BASE64_TOKEN)) {
    const token = match[1];
    if (token.length > 4096 || token.length % 4 === 1) continue;
    try {
      const value = Buffer.from(token, 'base64').toString('utf8');
      if (!value || /\uFFFD/.test(value)) continue;
      const printable = [...value].filter((char) => char === '\n' || char === '\t' || (char >= ' ' && char <= '~')).length / Math.max(1, value.length);
      if (printable >= 0.85) decoded.push(normalizePromptSecurityText(value).slice(0, 4000));
    } catch {}
  }
  return decoded.slice(0, 4);
}

function collectSignals(text, origin = 'plain') {
  const hits = [];
  for (const signal of SIGNALS) {
    if (signal.test.test(text)) hits.push({ id: signal.id, weight: signal.weight, origin });
  }
  return hits;
}

function dedupeSignals(signals) {
  const map = new Map();
  for (const signal of signals) {
    const existing = map.get(signal.id);
    if (!existing || signal.weight > existing.weight) map.set(signal.id, signal);
  }
  return [...map.values()];
}

function scoreToRisk(score) {
  if (score >= 9) return 'CRITICAL';
  if (score >= 6) return 'HIGH';
  if (score >= 3) return 'MEDIUM';
  if (score >= 1) return 'LOW';
  return 'NONE';
}

export function inspectPromptSecurity(content, {
  source = 'external',
  priorFragments = [],
  sourceId = null
} = {}) {
  const normalized = normalizePromptSecurityText(content);
  const composite = normalizePromptSecurityText([...priorFragments, normalized].join('\n'));
  const decodedPercent = decodePercentOnce(composite);
  const decodedBase64 = decodeBase64Candidates(composite);

  let signals = collectSignals(composite, 'normalized');
  if (decodedPercent) signals.push(...collectSignals(decodedPercent, 'url-decoded'));
  for (const decoded of decodedBase64) signals.push(...collectSignals(decoded, 'base64-decoded'));
  if (ZERO_WIDTH_OR_BIDI.test(boundedString(content))) signals.push({ id: 'unicode_concealment', weight: 3, origin: 'raw' });
  ZERO_WIDTH_OR_BIDI.lastIndex = 0;

  signals = dedupeSignals(signals);
  const score = signals.reduce((sum, signal) => sum + signal.weight, 0);
  const risk = scoreToRisk(score);
  const trust = PROMPT_SOURCE_TRUST[source] || PROMPT_SOURCE_TRUST.unknown;
  const external = trust === 'UNTRUSTED_DATA';

  return {
    regimeVersion: PROMPT_SECURITY_REGIME_VERSION,
    source,
    sourceId,
    trust,
    contentHash: hash(normalized),
    risk,
    score,
    signals,
    decodedRepresentationsChecked: {
      percentEncoding: Boolean(decodedPercent),
      base64Candidates: decodedBase64.length
    },
    policy: {
      treatAsDataOnly: external,
      instructionsMayChangePolicy: false,
      toolCallsFromContentAllowed: false,
      memoryWritesFromContentAllowed: false,
      externalSideEffectsFromContentAllowed: false,
      privilegedTranscriptObjectsAllowed: false,
      streamRawHtmlAllowed: false
    },
    disposition: external
      ? (score >= 6 ? 'QUARANTINE_INSTRUCTIONS' : 'DATA_ONLY')
      : (score >= 6 ? 'USER_INTENT_REVIEW' : 'CONTINUE_WITH_POLICY'),
    normalizedPreview: normalized.slice(0, 1000)
  };
}

export function validateProviderTranscriptInput(value) {
  const violations = [];
  const visit = (node, path = '$') => {
    if (Array.isArray(node)) {
      node.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    if (!node || typeof node !== 'object') return;
    for (const [key, item] of Object.entries(node)) {
      const lower = key.toLowerCase();
      if (PRIVILEGED_KEYS.has(lower)) violations.push({ path: `${path}.${key}`, key });
      if (lower === 'role' && String(item).toLowerCase() !== 'user') violations.push({ path: `${path}.${key}`, key, reason: 'Only user role may originate from untrusted input' });
      visit(item, `${path}.${key}`);
    }
  };
  visit(value);
  return {
    accepted: violations.length === 0,
    violations,
    policy: 'Build provider transcripts server-side. Untrusted clients may supply plain user content only.'
  };
}

export function externalContentEnvelope({ content, source = 'external', sourceId = null, priorFragments = [] } = {}) {
  const inspection = inspectPromptSecurity(content, { source, sourceId, priorFragments });
  return {
    kind: 'UNTRUSTED_EXTERNAL_DATA',
    source,
    sourceId,
    content: normalizePromptSecurityText(content),
    inspection,
    execution: {
      followEmbeddedInstructions: false,
      allowTools: false,
      allowMemoryWrites: false,
      allowExternalActions: false
    }
  };
}
