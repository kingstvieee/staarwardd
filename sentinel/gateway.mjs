// Mandatory preflight adapter for any future provider tool invocation.
// This is a local reference gate, not an independently deployed enforcement service.
import { Sentinel } from './policy.mjs';
export class SentinelGateway {
  #sentinel;
  constructor(sentinel) {
    if (!(sentinel instanceof Sentinel)) throw new TypeError('Sentinel required');
    this.#sentinel=sentinel;
  }
  async execute(request, handler) {
    if(typeof handler!=='function') throw new TypeError('Handler required');
    const decision=this.#sentinel.authorize(request);
    if(!decision.allowed) return {executed:false,decision};
    // Recheck revision immediately before invoking handler. A remote provider
    // needs a separate revocation/lease mechanism for in-flight operations.
    const revision=this.#sentinel.status.revision;
    await Promise.resolve();
    if(this.#sentinel.status.revision!==revision) return {executed:false,decision:{allowed:false,reason:'policy_changed'}};
    return {executed:true,decision,result:await handler()};
  }
}
