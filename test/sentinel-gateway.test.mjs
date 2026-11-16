import test from 'node:test';
import assert from 'node:assert/strict';
import {Sentinel,MODES} from '../sentinel/policy.mjs';
import {SentinelGateway} from '../sentinel/gateway.mjs';
test('denied operation never invokes provider',async()=>{
 let calls=0;
 const gateway=new SentinelGateway(new Sentinel());
 const response=await gateway.execute({action:'device.actuate',principal:'owner',scopes:['device.actuate'],approved:true,stepUp:true},()=>{calls++;});
 assert.equal(response.executed,false);assert.equal(calls,0);
});
test('permitted operation invokes provider exactly once',async()=>{
 let calls=0;
 const gateway=new SentinelGateway(new Sentinel({initialMode:MODES.NORMAL}));
 const response=await gateway.execute({action:'read',principal:'owner',scopes:['read']},()=>++calls);
 assert.equal(response.executed,true);assert.equal(calls,1);assert.equal(response.result,1);
});
test('provider errors propagate without false success',async()=>{
 const gateway=new SentinelGateway(new Sentinel({initialMode:MODES.NORMAL}));
 await assert.rejects(()=>gateway.execute({action:'read',principal:'owner',scopes:['read']},()=>{throw Error('provider unavailable')}),/provider unavailable/);
});
