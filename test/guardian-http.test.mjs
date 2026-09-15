import test from 'node:test';
import assert from 'node:assert/strict';
import { server } from '../server.mjs';

async function withServer(run){
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const {port}=server.address();
  try { await run(`http://127.0.0.1:${port}`); }
  finally { await new Promise(resolve=>server.close(resolve)); }
}

test('Guardian briefing is exposed through the STAAR Hub server', async()=>{
  await withServer(async base=>{
    const res=await fetch(`${base}/api/guardian/briefing`);
    assert.equal(res.status,200);
    const data=await res.json();
    assert.equal(data.guardian,'core-v1');
    assert.equal(data.activeCount,3);
    assert.equal(data.priority.id,'hub-core-build');
    assert.equal(data.temporal.timezone,'America/Toronto');
  });
});

test('portal mission view uses the same Guardian brain', async()=>{
  await withServer(async base=>{
    const res=await fetch(`${base}/api/guardian/missions?portal=Style`);
    const data=await res.json();
    assert.deepEqual(data.missions.map(m=>m.id),['rsf-fabric-sourcing']);
  });
});

test('Private Mode is writable and reflected in the next briefing', async()=>{
  await withServer(async base=>{
    let res=await fetch(`${base}/api/guardian/private-mode`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({enabled:true})});
    assert.equal(res.status,200);
    res=await fetch(`${base}/api/guardian/briefing`);
    const data=await res.json();
    assert.equal(data.privateMode,true);
  });
});

test('API rejects unverified completion', async()=>{
  await withServer(async base=>{
    const res=await fetch(`${base}/api/guardian/missions/hub-core-build`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({patch:{status:'completed'},ledgerState:'ATTEMPTED',summary:'Tried it'})});
    assert.equal(res.status,400);
    const data=await res.json();
    assert.match(data.error,/VERIFIED_COMPLETE/);
  });
});
