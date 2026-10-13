import { randomUUID } from 'node:crypto';
import { inspectPromptSecurity } from './guardian-prompt-security.mjs';

const ALLOWED_DECISIONS = new Set(['APPROVE', 'REJECT']);

function clean(value, max = 2000) {
  return String(value ?? '').trim().slice(0, max);
}

export class GuardianMemoryQuarantine {
  #items = new Map();
  #audit;

  constructor({ audit = null } = {}) {
    this.#audit = audit;
  }

  propose({ content, source = 'user', sourceId = null, category = 'general', metadata = {} } = {}) {
    const text = clean(content, 5000);
    if (!text) throw new Error('Memory content is required');
    const inspection = inspectPromptSecurity(text, { source, sourceId });
    const external = inspection.trust === 'UNTRUSTED_DATA';
    const item = {
      memoryId: `memory-${randomUUID()}`,
      content: text,
      source,
      sourceId: sourceId ? clean(sourceId, 300) : null,
      category: clean(category, 120) || 'general',
      metadata: structuredClone(metadata),
      inspection,
      state: 'QUARANTINED',
      createdAt: new Date().toISOString(),
      reviewedAt: null,
      committedAt: null,
      reviewNote: '',
      writeEligible: !external && !['HIGH', 'CRITICAL'].includes(inspection.risk)
    };
    this.#items.set(item.memoryId, item);
    this.#audit?.append({ type: 'MEMORY_QUARANTINED', memoryId: item.memoryId, source, category: item.category, risk: inspection.risk, writeEligible: item.writeEligible });
    return structuredClone(item);
  }

  review(memoryId, { decision, ownerAuthenticated = false, explicitApproval = false, note = '' } = {}) {
    const item = this.#items.get(String(memoryId));
    if (!item) throw new Error('Memory proposal not found');
    if (!ALLOWED_DECISIONS.has(decision)) throw new Error('Decision must be APPROVE or REJECT');
    if (!ownerAuthenticated) throw new Error('Authenticated owner context is required');
    if (decision === 'APPROVE' && !explicitApproval) throw new Error('Explicit approval is required to commit memory');
    if (decision === 'APPROVE' && !item.writeEligible) throw new Error('Quarantined external or high-risk content cannot be committed directly');

    item.reviewedAt = new Date().toISOString();
    item.reviewNote = clean(note, 800);
    if (decision === 'REJECT') {
      item.state = 'REJECTED';
      this.#audit?.append({ type: 'MEMORY_REJECTED', memoryId: item.memoryId });
      return structuredClone(item);
    }
    item.state = 'APPROVED';
    item.committedAt = item.reviewedAt;
    this.#audit?.append({ type: 'MEMORY_APPROVED', memoryId: item.memoryId, category: item.category });
    return structuredClone(item);
  }

  get(memoryId) {
    const item = this.#items.get(String(memoryId));
    return item ? structuredClone(item) : null;
  }

  list({ state = null } = {}) {
    return [...this.#items.values()]
      .filter((item) => !state || item.state === state)
      .map((item) => structuredClone(item));
  }
}
