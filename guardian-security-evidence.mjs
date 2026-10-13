import { createHash, randomUUID } from 'node:crypto';

function hash(value) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }

export class GuardianSecurityEvidenceRegistry {
  #records = new Map();
  #audit;
  constructor({ audit = null } = {}) { this.#audit = audit; }

  record({ suite, caseId, result, severity = 'info', artifact = null, metadata = {} } = {}) {
    if (!suite || !caseId || !result) throw new Error('suite, caseId, and result are required');
    const evidence = {
      evidenceId: `security-${randomUUID()}`,
      suite: String(suite),
      caseId: String(caseId),
      result: String(result),
      severity: String(severity),
      artifactHash: artifact == null ? null : hash(artifact),
      metadata: structuredClone(metadata),
      createdAt: new Date().toISOString()
    };
    this.#records.set(evidence.evidenceId, evidence);
    this.#audit?.append({ type: 'SECURITY_EVIDENCE_RECORDED', evidenceId: evidence.evidenceId, suite: evidence.suite, caseId: evidence.caseId, result: evidence.result, severity: evidence.severity });
    return structuredClone(evidence);
  }

  summary() {
    const records = [...this.#records.values()];
    return {
      total: records.length,
      passed: records.filter((item) => item.result === 'PASS').length,
      failed: records.filter((item) => item.result === 'FAIL').length,
      blocked: records.filter((item) => item.result === 'BLOCKED').length,
      records: records.map((item) => structuredClone(item))
    };
  }

  missionEvidence(missionId) {
    const relevant = [...this.#records.values()].filter((item) => item.metadata?.missionId === missionId);
    return {
      missionId,
      securityVerified: relevant.length > 0 && relevant.every((item) => item.result === 'PASS'),
      evidence: relevant.map((item) => structuredClone(item))
    };
  }
}
