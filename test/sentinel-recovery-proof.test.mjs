import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign, randomUUID } from 'node:crypto';
import { verifyRecoveryCommand } from '../sentinel/recovery-proof.mjs';

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const now = 1794859200000;
function make(overrides={}) {
  const payload={action:'owner.recover',audience:'starcenttinel-control',expiresAt:now+60000,issuedAt:now-1000,nonce:randomUUID(),revision:4,targetMode:'NORMAL',...overrides};
  const fields=Object.keys(payload).sort();
  const signature=sign(null,Buffer.from(JSON.stringify(fields.map(k=>[k,payload[k]]))),privateKey).toString('base64url');
  return {payload,signature};
}
test('valid proof is only a proof, not recovery',()=>{
  const result=verifyRecoveryCommand(make(),{publicKey,now});
  assert.equal(result.valid,true);
  assert.equal(result.reason,'signature_verified_only');
});
test('tampering rejected',()=>assert.equal(verifyRecoveryCommand({...make(),payload:{...make().payload,revision:5}},{publicKey,now}).valid,false));
test('expired rejected',()=>assert.equal(verifyRecoveryCommand(make({expiresAt:now}),{publicKey,now}).valid,false));
test('wrong audience rejected',()=>assert.equal(verifyRecoveryCommand(make({audience:'guardian'}) ,{publicKey,now}).valid,false));
test('extra claims rejected',()=>assert.equal(verifyRecoveryCommand(make({admin:true}),{publicKey,now}).valid,false));
test('no key rejected',()=>assert.equal(verifyRecoveryCommand(make(),{now}).valid,false));
