import { createHash, randomUUID } from 'node:crypto';
import { externalContentEnvelope } from './guardian-prompt-security.mjs';

function hash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function clean(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

function containsCredentialLikeKeys(value) {
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, item]) => {
    if (/password|secret|private[_-]?key|access[_-]?token|api[_-]?key|credential/i.test(key)) return true;
    return item && typeof item === 'object' ? containsCredentialLikeKeys(item) : false;
  });
}

export class ConnectorProvenanceRegistry {
  #connectors = new Map();
  #audit;

  constructor({ audit = null } = {}) {
    this.#audit = audit;
  }

  register({ connectorId, provider, displayName, trustDomain = 'external', allowedResources = [] } = {}) {
    const id = clean(connectorId, 120);
    if (!id || !provider) throw new Error('connectorId and provider are required');
    const descriptor = {
      connectorId: id,
      provider: clean(provider, 120),
      displayName: clean(displayName || provider, 160),
      trustDomain: clean(trustDomain, 80) || 'external',
      allowedResources: [...new Set(allowedResources.map((item) => clean(item, 180)).filter(Boolean))],
      registeredAt: new Date().toISOString()
    };
    this.#connectors.set(id, descriptor);
    this.#audit?.append({ type: 'CONNECTOR_REGISTERED', connectorId: id, provider: descriptor.provider, trustDomain: descriptor.trustDomain });
    return structuredClone(descriptor);
  }

  wrap({ connectorId, resource, operation = 'read', content, sourceId = null, metadata = {} } = {}) {
    const connector = this.#connectors.get(String(connectorId));
    if (!connector) throw new Error('Unknown connector');
    if (containsCredentialLikeKeys(metadata)) throw new Error('Credential material cannot enter connector provenance metadata');
    const resourceName = clean(resource, 180);
    if (!resourceName) throw new Error('resource is required');
    if (connector.allowedResources.length && !connector.allowedResources.includes(resourceName)) throw new Error('Resource is outside connector provenance scope');

    const provenance = {
      provenanceId: `prov-${randomUUID()}`,
      connectorId: connector.connectorId,
      provider: connector.provider,
      resource: resourceName,
      operation: clean(operation, 80) || 'read',
      sourceId: sourceId ? clean(sourceId, 300) : null,
      observedAt: new Date().toISOString(),
      metadata: structuredClone(metadata)
    };
    provenance.integrityHash = hash(provenance);
    const envelope = externalContentEnvelope({
      content,
      source: 'connector',
      sourceId: provenance.sourceId || provenance.provenanceId
    });
    this.#audit?.append({ type: 'CONNECTOR_CONTENT_WRAPPED', provenanceId: provenance.provenanceId, connectorId: connector.connectorId, resource: resourceName, operation: provenance.operation, risk: envelope.inspection.risk });
    return {
      provenance,
      trust: 'UNTRUSTED_DATA',
      instructionAuthority: false,
      envelope
    };
  }

  list() {
    return [...this.#connectors.values()].map((item) => structuredClone(item));
  }
}
