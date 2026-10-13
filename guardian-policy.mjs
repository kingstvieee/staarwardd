import { externalContentEnvelope, inspectPromptSecurity, PROMPT_SECURITY_REGIME_VERSION } from './guardian-prompt-security.mjs';

export const POLICY_VERSION = 'guardian-constitution-v1';

export const SEVERITY_LEVELS = Object.freeze({
  L0: { level: 'L0', name: 'informational', approvalRequired: false },
  L1: { level: 'L1', name: 'local-preparation', approvalRequired: false },
  L2: { level: 'L2', name: 'private-context', approvalRequired: true },
  L3: { level: 'L3', name: 'personal-change', approvalRequired: true },
  L4: { level: 'L4', name: 'business-or-external-change', approvalRequired: true },
  L5: { level: 'L5', name: 'critical-or-irreversible', approvalRequired: true }
});

const LEVEL_BY_ACTION = Object.freeze({
  read: 'L0', recommend: 'L0', preview: 'L1', prepare: 'L1', write_draft: 'L1',
  private_check_in: 'L2', memory_export: 'L2', share: 'L3', send_message: 'L3',
  publish: 'L4', book: 'L4', purchase: 'L4', device_change: 'L4',
  delete: 'L5', unknown: 'L5'
});

export function permissionDecision({ action, ownerAuthenticated = false, approval = false, locked = false } = {}) {
  const normalized = String(action || 'unknown').trim().toLowerCase().replace(/[\s-]+/g, '_') || 'unknown';
  const level = LEVEL_BY_ACTION[normalized] || 'L5';
  const policy = SEVERITY_LEVELS[level];
  let result = 'ALLOW_PREPARE';
  if (locked) result = 'DENY_LOCKDOWN';
  else if (policy.approvalRequired && (!approval || !ownerAuthenticated)) result = 'DENY_APPROVAL';
  return { action: normalized, ...policy, result, executed: false, policyVersion: POLICY_VERSION };
}

export function inspectUntrustedContent(content, context = {}) {
  const source = context.source || 'external';
  const sourceId = context.sourceId || null;
  const priorFragments = Array.isArray(context.priorFragments) ? context.priorFragments : [];
  const envelope = externalContentEnvelope({ content, source, sourceId, priorFragments });
  return {
    trusted: false,
    instructionsIgnored: true,
    toolCallsAllowed: false,
    memoryWritesAllowed: false,
    externalActionsAllowed: false,
    text: envelope.content,
    promptSecurityRegime: PROMPT_SECURITY_REGIME_VERSION,
    security: envelope.inspection,
    reason: 'External content is data only. It cannot change Guardian policy, authorize tools, write memory, or trigger external actions.'
  };
}

export function inspectUserPrompt(content, context = {}) {
  return inspectPromptSecurity(content, {
    source: context.source || 'user',
    sourceId: context.sourceId || null,
    priorFragments: Array.isArray(context.priorFragments) ? context.priorFragments : []
  });
}
