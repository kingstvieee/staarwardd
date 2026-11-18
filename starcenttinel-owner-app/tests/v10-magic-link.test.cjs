const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const babel = require('@babel/core');
const file = path.join(__dirname, '../src/ownerApi.js');
process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_public_key';
function load() {
  const transformed = babel.transformSync(fs.readFileSync(file, 'utf8'), {babelrc:false,configFile:false,plugins:['@babel/plugin-transform-modules-commonjs']}).code;
  const mod = new Module(file, module);
  mod.filename = file;
  mod.paths = module.paths;
  mod._compile(transformed, file);
  return mod.exports;
}
const api=load();
test('request uses built-in Supabase email without an unapproved redirect', async () => {
  const calls=[]; const old=global.fetch;
  try {
    global.fetch=async(u,o)=>{calls.push({u,o}); return {ok:true,status:200};};
    await api.requestMagicLink('owner@example.com');
    assert.equal(calls.length,1);
    assert.equal(calls[0].u, 'https://khpprzhqovzhgxdltarq.supabase.co/auth/v1/otp');
    assert.deepEqual(JSON.parse(calls[0].o.body),{email:'owner@example.com',create_user:false});
  } finally { global.fetch=old; }
});
test('rejects unrelated hosts and paths without sending a token', async () => {
  const old=global.fetch; let calls=0;
  try {
    global.fetch=async()=>{calls++; throw Error('fetch must not run');};
    await assert.rejects(api.exchangeCopiedEmailLink('https://attacker.example/auth/v1/verify?type=magiclink&token='+ 'a'.repeat(32)));
    await assert.rejects(api.exchangeCopiedEmailLink('https://khpprzhqovzhgxdltarq.supabase.co/not-verify?type=magiclink&token='+'a'.repeat(32)));
    await assert.rejects(api.exchangeCopiedEmailLink('https://khpprzhqovzhgxdltarq.supabase.co/auth/v1/verify?type=recovery&token='+'a'.repeat(32)));
    assert.equal(calls,0);
  } finally {global.fetch=old;}
});
test('exchanges one-time link using token hash only with the correct Supabase Auth endpoint', async () => {
  const old=global.fetch; let call;
  try {
    global.fetch=async(u,o)=>{call={u,o};return {ok:true,json:async()=>({access_token:'signed-jwt-from-auth'})};};
    const link='https://khpprzhqovzhgxdltarq.supabase.co/auth/v1/verify?token='+ 'a'.repeat(64) +'&type=magiclink&redirect_to=http%3A%2F%2Flocalhost%3A3000';
    const jwt=await api.exchangeCopiedEmailLink(link);
    assert.equal(jwt,'signed-jwt-from-auth');
    assert.equal(call.u,'https://khpprzhqovzhgxdltarq.supabase.co/auth/v1/verify');
    assert.deepEqual(JSON.parse(call.o.body),{token_hash:'a'.repeat(64),type:'magiclink'});
  } finally {global.fetch=old;}
});
test('bad token response never grants session', async () => {
  const old=global.fetch;
  try {
    global.fetch=async()=>({ok:false,status:401});
    await assert.rejects(api.exchangeCopiedEmailLink('https://khpprzhqovzhgxdltarq.supabase.co/auth/v1/verify?token='+ 'a'.repeat(64) +'&type=magiclink'));
  } finally {global.fetch=old;}
});