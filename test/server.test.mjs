import test from 'node:test';
import assert from 'node:assert/strict';
process.env.STAARWARDD_DEMO_ONLY = '1';
const { demoPlan, server } = await import('../server.mjs');

test('demo engine is deterministic', () => {
  const a = demoPlan('Plan work, groceries, and a walk');
  const b = demoPlan('Plan work, groceries, and a walk');
  assert.deepEqual(a, b);
  assert.deepEqual(a.domains, ['Work', 'Home', 'Wellbeing']);
  assert.ok(a.now.length);
  assert.ok(a.today.length);
  assert.ok(a.week.length);
});

test('sensitive intent requires approval', () => {
  const plan = demoPlan('Send an email and buy groceries');
  assert.equal(plan.sensitive, true);
  assert.equal(plan.today[0].sensitive, true);
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
});
test('three specialist portals return distinct functional playbooks', () => {
  const relationships = demoPlan('Relationships context: draft and send a kind message to my sister');
  assert.deepEqual(relationships.domains, ['Relationships']);
  assert.equal(relationships.sensitive, true);
  assert.match(relationships.now[0].title, /connection need/i);
  assert.match(relationships.today[0].title, /human message/i);

  const community = demoPlan('Community context: compare a neighbourhood volunteer event');
  assert.deepEqual(community.domains, ['Community']);
  assert.match(community.now[0].title, /circle of impact/i);
  assert.match(community.today[0].title, /contribution/i);

  const style = demoPlan('Style context: build an outfit from my wardrobe');
  assert.deepEqual(style.domains, ['Style']);
  assert.match(style.now[0].title, /outfit formula/i);
  assert.match(style.week[0].title, /wardrobe/i);
  assert.ok([...relationships.now, ...community.today, ...style.week].every(task => typeof task.sensitive === 'boolean'));
});
