import test from 'node:test';
import assert from 'node:assert/strict';
process.env.STAARWARDD_DEMO_ONLY = '1';
const serverModule = await import('../server.mjs');
const { demoPlan, scenarioPlan, server } = serverModule;
const { default: vercelHandler } = await import('../api/index.mjs');

test('Vercel entry point exports the existing server handler', () => {
  assert.equal(typeof vercelHandler, 'function');
  assert.equal(serverModule.default, server);
});

test('demo engine is deterministic', () => {
  const a = demoPlan('Plan work, groceries, and a walk');
  const b = demoPlan('Plan work, groceries, and a walk');
  assert.deepEqual(a, b);
  assert.deepEqual(a.domains, ['Work', 'Home', 'Wellbeing']);
  assert.ok(a.now.length);
  assert.ok(a.today.length);
  assert.ok(a.week.length);
  assert.deepEqual(a.coordination.agents, ['Work', 'Home', 'Wellbeing']);
  assert.deepEqual(a.coordination.exchanges.map(item => `${item.from}->${item.to}`), ['Work->Home', 'Home->Wellbeing']);
  assert.match(a.coordination.decision, /no external action taken/i);
});

test('sensitive intent requires approval', () => {
  const plan = demoPlan('Send an email and buy groceries');
  assert.equal(plan.sensitive, true);
  assert.equal(plan.today[0].sensitive, true);
  assert.match(plan.coordination.decision, /explicit approval required/i);
});

test('fallback activates useful domains', () => {
  assert.deepEqual(demoPlan('Help me sort everything').domains, ['Work', 'Wellbeing']);
});

test('server serves app, query URLs, media, and API', async t => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const { port } = server.address();
  const base = 'http://127.0.0.1:' + port;

  const home = await fetch(base + '/?autoplay=1');
  assert.equal(home.status, 200);
  const homeText = await home.text();
  assert.match(homeText, /StaarWardd/);
  assert.match(homeText, /STAAR/);
  assert.match(homeText, /cinematic-brand/);
  assert.match(homeText, /talkButton/);
  assert.match(homeText, /id="portalWorld"/);
  assert.match(homeText, /Detects context/);
  assert.match(homeText, /Activates relevant agents/);
  assert.match(homeText, /Portals exchange signals/);
  assert.match(homeText, /Prepares or acts by permission/);
  assert.match(homeText, /id="coordinationTrace"/);
  assert.match(homeText, /staarwardd-guardian-toronto-v9\.png/);
  assert.match(homeText, /staarwardd-summoning-bubble-v9\.png/);
  assert.match(homeText, /staarwardd-summoning-sword-v9\.png/);
  assert.match(homeText, /STAAR<\/span><strong>WARDD/);
  assert.doesNotMatch(homeText, /guardianFlightVideo|staarwardd-flight\.mp4|HeyGen|staarwardd-toronto-clean/);
  assert.doesNotMatch(homeText, /starward-toronto-cinematic-v7\.webp/);
  assert.doesNotMatch(homeText, /flight-keyframe|hover-keyframe/);

  for (const asset of ['/staarwardd-guardian-toronto-v9.png', '/staarwardd-summoning-bubble-v9.png', '/staarwardd-summoning-sword-v9.png']) {
    const response = await fetch(base + asset);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^image\/png/);
    assert.ok((await response.arrayBuffer()).byteLength > 1000);
  }

  const missingVideo = await fetch(base + '/missing-flight.mp4');
  assert.equal(missingVideo.status, 404);

  const styles = await fetch(base + '/styles.css');
  assert.equal(styles.status, 200);
  const styleText = await styles.text();
  assert.match(styleText, /portal-bubble-open-v9/);
  assert.match(styleText, /sword-cast-left-high-v9/);

  const api = await fetch(base + '/api/plan', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ input: 'creative writing and a walk' })
  });
  assert.equal(api.status, 200);
  const data = await api.json();
  assert.equal(data.mode, 'demo');
  assert.deepEqual(data.sources, []);
  assert.deepEqual(data.plan.domains, ['Creativity', 'Wellbeing']);

  const scenario = await fetch(base + '/api/scenario', { method:'POST' });
  assert.equal(scenario.status, 200);
  const scenarioData = await scenario.json();
  assert.equal(scenarioData.mode, 'scenario');
  assert.deepEqual(scenarioData.plan.domains, ['Work', 'Style', 'Relationships', 'Home']);
  assert.equal(scenarioData.statePatch.relationships.commitment, 'Anniversary dinner');
});

test('single-domain requests do not activate unrelated portal agents', () => {
  const plan = demoPlan('Home context: check my household security');
  assert.deepEqual(plan.coordination.agents, ['Home']);
  assert.deepEqual(plan.coordination.exchanges, []);
  assert.ok([...plan.now, ...plan.today, ...plan.week].every(task => plan.coordination.agents.includes(task.domain)));
});

test('founder scenario coordinates four portals without executing actions', () => {
  const result = scenarioPlan();
  assert.deepEqual(result.plan.domains, ['Work', 'Style', 'Relationships', 'Home']);
  assert.deepEqual(result.plan.coordination.agents, result.plan.domains);
  assert.equal(result.plan.coordination.exchanges.length, 3);
  assert.equal(result.plan.sensitive, true);
  assert.ok([...result.plan.now, ...result.plan.today].some(task => task.sensitive));
  assert.match(result.plan.coordination.decision, /approval/i);
  assert.equal(result.statePatch.scenario, 'founder-evening');
  assert.equal(result.statePatch.home.arrivalRoutine, 'prepared-delay');
});
test('three specialist portals return distinct functional playbooks', () => {
  const relationships = demoPlan('Relationships context: draft and send a kind message to my sister');
  assert.deepEqual(relationships.domains, ['Relationships']);
  assert.equal(relationships.sensitive, true);
  assert.match(relationships.now[0].title, /person/i);
  assert.match(relationships.today[0].title, /human communication/i);

  const community = demoPlan('Community context: compare a neighbourhood volunteer event');
  assert.deepEqual(community.domains, ['Community']);
  assert.match(community.now[0].title, /connection layer/i);
  assert.match(community.today[0].title, /accessible possibilities/i);

  const style = demoPlan('Style context: build an outfit from my wardrobe');
  assert.deepEqual(style.domains, ['Style']);
  assert.match(style.now[0].title, /fitting room/i);
  assert.match(style.week[0].title, /wardrobe/i);
  assert.ok([...relationships.now, ...community.today, ...style.week].every(task => typeof task.sensitive === 'boolean'));
});

test('locked portal integrations route to their real environments', () => {
  const home = demoPlan('Prepare my arrival, security devices, and STAAR Access routine');
  assert.deepEqual(home.domains, ['Home']);
  assert.match(home.now[0].title, /household state/i);
  assert.match(home.week[0].title, /STAAR Access/i);

  const creativity = demoPlan('Use DIGGITSTAAR for media content production');
  assert.deepEqual(creativity.domains, ['Creativity']);
  assert.match(creativity.now[0].title, /DIGGITSTAAR/i);

  const style = demoPlan('Open the RISING STAARDFORM fitting mirror and wardrobe');
  assert.deepEqual(style.domains, ['Style']);
  assert.match(style.now[0].title, /fitting room/i);
});
