import test from 'node:test';
import assert from 'node:assert/strict';
import {Sentinel,MODES} from '../sentinel/policy.mjs';
import {TrustedActionBroker} from '../sentinel/trusted-broker.mjs';
test('broker denies unverified authority',async()=>{
 let called=0;
 const broker=new TrustedActionBroker({sentinel:new Sentinel({initialMode:MODES.NORMAL}),resolveAuthority:async()=>null});
 const r=await broker.execute({session:'untrusted',action:'read'},()=>called++);
 assert.equal(r.executed,false);assert.equal(called,0);
});
test('broker ignores caller approval and scopes',async()=>{
 const broker=new TrustedActionBroker({sentinel:new Sentinel({initialMode:MODES.NORMAL}),resolveAuthority:async()=>({valid:true,action:'payment.create',principal:'owner',scopes:['payment.create'],approved:false,stepUp:false})});
 const r=await broker.execute({session:'s',action:'payment.create',approved:true,stepUp:true,scopes:['payment.create']},()=>{throw Error('must not run')});
 assert.equal(r.executed,false);
});
test('broker executes server-authorized scoped read',async()=>{
 const broker=new TrustedActionBroker({sentinel:new Sentinel({initialMode:MODES.NORMAL}),resolveAuthority:async()=>({valid:true,action:'read',principal:'owner',scopes:['read']})});
 const r=await broker.execute({session:'s',action:'read'},()=>42);
 assert.equal(r.executed,true);assert.equal(r.result,42);
});
test('broker rejects action mismatch',async()=>{
 const broker=new TrustedActionBroker({sentinel:new Sentinel({initialMode:MODES.NORMAL}),resolveAuthority:async()=>({valid:true,action:'read',principal:'owner',scopes:['read']})});
 const r=await broker.execute({session:'s',action:'publish'},()=>{throw Error('must not run')});
 assert.equal(r.executed,false);
});
