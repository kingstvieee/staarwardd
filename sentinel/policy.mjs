// StarCenttinel reference policy kernel. No external actions or privileged credentials.
// This module is NOT a substitute for an independent deployed control plane.
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
export const MODES = Object.freeze({ NORMAL:0, CAUTION:1, CONTAIN:2, LOCKDOWN:3 });
const ACTIONS = new Set(['read','plan','message.send','payment.create','device.actuate','publish','admin.recover']);
const HIGH_RISK = new Set(['message.send','payment.create','device.actuate','publish','admin.recover']);
const validMode = m => Number.isInteger(m) && m>=0 && m<=3;
export class Sentinel {
  #mode; #revision; #log=[]; #file;
  constructor({file, initialMode=MODES.LOCKDOWN}={}) {
    if(!validMode(initialMode)) throw Error('Invalid mode');
    this.#file=file;
    let saved;
    if(file) { try { saved=JSON.parse(readFileSync(file,'utf8')); } catch(e) { if(e.code!=='ENOENT') throw e; } }
    if(saved && (!validMode(saved.mode)||!Number.isSafeInteger(saved.revision)||saved.revision<0)) throw Error('Corrupt sentinel state: fail closed');
    this.#mode=saved?.mode ?? initialMode; this.#revision=saved?.revision ?? 0;
  }
  get status(){return Object.freeze({mode:this.#mode,revision:this.#revision});}
  authorize({action, principal, scopes=[], approved=false, stepUp=false, online=true}={}) {
    if(!ACTIONS.has(action)||!principal||!Array.isArray(scopes)) return {allowed:false,reason:'invalid_request'};
    if(this.#mode===MODES.LOCKDOWN) return {allowed:false,reason:'lockdown'};
    if(this.#mode===MODES.CONTAIN && action!=='read') return {allowed:false,reason:'containment'};
    if(!online && action!=='read' && action!=='plan') return {allowed:false,reason:'offline'};
    if(!scopes.includes(action)) return {allowed:false,reason:'missing_scope'};
    if(HIGH_RISK.has(action) && (!approved||!stepUp)) return {allowed:false,reason:'step_up_required'};
    if(this.#mode===MODES.CAUTION && HIGH_RISK.has(action)) return {allowed:false,reason:'caution'};
    return {allowed:true,reason:'policy_permit'};
  }
  // Escalation can be initiated by watchdog; de-escalation requires independent verified operator.
  transition(next,{actor='watchdog',verified=false,reason='unspecified'}={}) {
    if(!validMode(next)) throw Error('Invalid mode');
    if(next<this.#mode && (actor!=='independent_owner'||!verified)) throw Error('Independent recovery required');
    if(next===this.#mode) return this.status;
    const event={id:randomUUID(),at:new Date().toISOString(),actor,reason,from:this.#mode,to:next,revision:this.#revision+1};
    // Persist state before advertising a transition; fail closed on storage failure.
    if(this.#file) {
      mkdirSync(dirname(this.#file),{recursive:true});
      const tmp=this.#file+'.'+process.pid+'.tmp';
      writeFileSync(tmp,JSON.stringify({mode:next,revision:event.revision}),{mode:0o600,flag:'wx'});
      renameSync(tmp,this.#file);
    }
    this.#mode=next;this.#revision++;
    this.#log.push({...event,digest:createHash('sha256').update(JSON.stringify(event)).digest('hex')});
    return this.status;
  }
  events(){return this.#log.map(x=>({...x}));}
}
