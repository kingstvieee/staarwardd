// Server-only authority adapter. Never forward client-provided scopes or approval flags.
import { SentinelGateway } from './gateway.mjs';
export class TrustedActionBroker {
  #gateway; #resolve;
  constructor({sentinel,resolveAuthority}) {
    if(typeof resolveAuthority!=='function') throw new TypeError('Trusted authority resolver required');
    this.#gateway=new SentinelGateway(sentinel);
    this.#resolve=resolveAuthority;
  }
  async execute({session,action,online=true},handler) {
    // The resolver MUST independently validate a server session, step-up proof,
    // action-specific consent and scopes. It must not echo untrusted client claims.
    const authority=await this.#resolve(session,action);
    if(!authority || authority.valid!==true || authority.action!==action) {
      return {executed:false,decision:{allowed:false,reason:'unverified_authority'}};
    }
    return this.#gateway.execute({
      action,principal:authority.principal,scopes:authority.scopes,
      approved:authority.approved===true,stepUp:authority.stepUp===true,
      online:online===true
    },handler);
  }
}
