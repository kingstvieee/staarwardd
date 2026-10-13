import { randomUUID } from 'node:crypto';

const VALID_RISK = new Set(['green','yellow','orange','red']);

export class GuardianIsolatedActionExecutor {
  #adapters = new Map();
  #audit;
  #authorize;
  #isLockedDown;

  constructor({ audit = null, authorize = null, isLockedDown = null } = {}) {
    this.#audit = audit;
    this.#authorize = typeof authorize === 'function' ? authorize : () => ({ allowed: false, reason: 'NO_AUTHORIZER' });
    this.#isLockedDown = typeof isLockedDown === 'function' ? isLockedDown : () => false;
  }

  setLockdownCheck(check) {
    if (typeof check !== 'function') throw new Error('Lockdown check must be a function');
    this.#isLockedDown = check;
  }

  registerAdapter({ adapterId, capabilities = [], execute } = {}) {
    if (!adapterId || typeof execute !== 'function') throw new Error('adapterId and execute are required');
    this.#adapters.set(String(adapterId), { adapterId: String(adapterId), capabilities: new Set(capabilities.map(String)), execute });
    return { adapterId: String(adapterId), capabilities: [...new Set(capabilities.map(String))] };
  }

  listAdapters() {
    return [...this.#adapters.values()].map((adapter) => ({ adapterId: adapter.adapterId, capabilities: [...adapter.capabilities] }));
  }

  async request({ adapterId, capability, input = {}, risk = 'green', approval = false, ownerAuthenticated = false, dryRun = true, timeoutMs = 5000, context = {} } = {}) {
    if (!VALID_RISK.has(risk)) throw new Error('Invalid risk level');
    const requestId = `action-${randomUUID()}`;

    if (this.#isLockedDown()) {
      const denied = { requestId, executed: false, allowed: false, reason: 'GUARDIAN_LOCKDOWN_ACTIVE' };
      this.#audit?.append({ type: 'ACTION_DENIED', requestId, adapterId, capability, risk, reason: denied.reason });
      return denied;
    }

    const adapter = this.#adapters.get(String(adapterId));
    if (!adapter || !adapter.capabilities.has(String(capability))) {
      const denied = { requestId, executed: false, allowed: false, reason: 'ADAPTER_OR_CAPABILITY_UNAVAILABLE' };
      this.#audit?.append({ type: 'ACTION_DENIED', ...denied, adapterId, capability });
      return denied;
    }

    const decision = await this.#authorize({ adapterId, capability, risk, approval, ownerAuthenticated, context });
    if (!decision?.allowed) {
      const denied = { requestId, executed: false, allowed: false, reason: decision?.reason || 'AUTHORIZATION_DENIED', decision };
      this.#audit?.append({ type: 'ACTION_DENIED', requestId, adapterId, capability, risk, reason: denied.reason });
      return denied;
    }

    if (dryRun) {
      const preview = { requestId, executed: false, allowed: true, dryRun: true, adapterId, capability, input: structuredClone(input), decision };
      this.#audit?.append({ type: 'ACTION_PREVIEWED', requestId, adapterId, capability, risk });
      return preview;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.max(100, Math.min(Number(timeoutMs) || 5000, 30000)));
    try {
      const result = await adapter.execute(structuredClone(input), { signal: controller.signal, requestId, context: structuredClone(context) });
      const receipt = { requestId, executed: true, allowed: true, dryRun: false, adapterId, capability, result };
      this.#audit?.append({ type: 'ACTION_EXECUTED', requestId, adapterId, capability, risk, result: 'SUCCESS' });
      return receipt;
    } catch (error) {
      const receipt = { requestId, executed: false, allowed: true, dryRun: false, adapterId, capability, error: error.name === 'AbortError' ? 'ACTION_TIMEOUT' : String(error.message || error) };
      this.#audit?.append({ type: 'ACTION_FAILED', requestId, adapterId, capability, risk, error: receipt.error });
      return receipt;
    } finally {
      clearTimeout(timer);
    }
  }
}
