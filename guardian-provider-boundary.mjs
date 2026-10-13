import { externalContentEnvelope, inspectPromptSecurity, validateProviderTranscriptInput } from './guardian-prompt-security.mjs';

function clean(value, max = 12000) {
  return String(value ?? '').slice(0, max);
}

export function validateClientConversationInput(input) {
  if (typeof input === 'string') {
    const inspection = inspectPromptSecurity(input, { source: 'user' });
    return { accepted: true, messages: [{ role: 'user', content: clean(input) }], inspection };
  }
  if (!Array.isArray(input)) return { accepted: false, violations: [{ path: '$', reason: 'Input must be a string or an array of user messages' }] };

  const schema = validateProviderTranscriptInput(input);
  const violations = [...schema.violations];
  const messages = [];
  input.forEach((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      violations.push({ path: `$[${index}]`, reason: 'Message must be an object' });
      return;
    }
    const allowedKeys = new Set(['role', 'content']);
    for (const key of Object.keys(item)) {
      if (!allowedKeys.has(key)) violations.push({ path: `$[${index}].${key}`, reason: 'Client message key is not allowed' });
    }
    if (item.role !== 'user') violations.push({ path: `$[${index}].role`, reason: 'Only user role may originate from clients' });
    if (typeof item.content !== 'string') violations.push({ path: `$[${index}].content`, reason: 'Message content must be a string' });
    else messages.push({ role: 'user', content: clean(item.content) });
  });

  return {
    accepted: violations.length === 0,
    violations,
    messages: violations.length ? [] : messages,
    inspections: violations.length ? [] : messages.map((message) => inspectPromptSecurity(message.content, { source: 'user' }))
  };
}

export function buildProviderBoundary({ clientInput, externalData = [] } = {}) {
  const client = validateClientConversationInput(clientInput);
  if (!client.accepted) return { accepted: false, client };
  const data = externalData.map((item, index) => externalContentEnvelope({
    content: item?.content ?? '',
    source: item?.source || 'external',
    sourceId: item?.sourceId || `external-${index + 1}`,
    priorFragments: Array.isArray(item?.priorFragments) ? item.priorFragments : []
  }));
  return {
    accepted: true,
    serverAuthoredRolesOnly: true,
    clientMessages: client.messages,
    externalData: data,
    policy: {
      clientMaySetSystemRole: false,
      clientMaySetDeveloperRole: false,
      clientMaySupplyToolResults: false,
      externalDataMayAuthorizeTools: false,
      externalDataMayWriteMemory: false,
      externalDataMayChangePolicy: false
    }
  };
}
