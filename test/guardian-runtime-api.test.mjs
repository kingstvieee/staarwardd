import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { handleRequest } from '../guardian-runtime-server.mjs';

async function withRuntime(run) {
  process.env.STAARWAARDD_OWNER_TOKEN = 'runtime-test-owner';
  const server = http.createServer(handleRequest);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;
  try { await run(base); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const body = await response.json();
  return { response, body };
}

test('Guardian M4 runtime exposes Mission, presence and trust capabilities', async () => {
  await withRuntime(async (base) => {
    const { response, body } = await jsonRequest(`${base}/api/guardian/runtime`);
    assert.equal(response.status, 200);
    assert.equal(body.runtime, 'M4_TRUST_EXPANSION');
    assert.equal(body.hud, true);
    assert.equal(body.missionEngine, true);
    assert.equal(body.presenceRegistry, true);
    assert.equal(body.trustExpansion, true);
    assert.equal(body.sessionIdentity, true);
    assert.equal(body.connectorProvenance, true);
    assert.equal(body.memoryQuarantine, true);
    assert.equal(body.providerBoundary, true);
    assert.equal(body.safeRendering, true);
    assert.equal(body.ambientSurveillance, false);
    assert.equal(body.sensorsDefault, 'ASK');
  });
});

test('Milo pilot is singleton and cannot be owner-accepted before verification', async () => {
  await withRuntime(async (base) => {
    const first = await jsonRequest(`${base}/api/guardian/missions/milo-pilot`, { method: 'POST', body: '{}' });
    const second = await jsonRequest(`${base}/api/guardian/missions/milo-pilot`, { method: 'POST', body: '{}' });
    assert.equal(first.response.status, 200);
    assert.equal(second.response.status, 200);
    assert.equal(first.body.mission.id, second.body.mission.id);
    assert.equal(first.body.mission.title, 'Milo Episode Completion Pilot');
    assert.ok(first.body.mission.criteria.length >= 10);

    const rejected = await jsonRequest(`${base}/api/guardian/missions`, {
      method: 'POST',
      body: JSON.stringify({ operation: 'accept', missionId: first.body.mission.id, approved: true })
    });
    assert.equal(rejected.response.status, 401);

    const authenticatedButPremature = await jsonRequest(`${base}/api/guardian/missions`, {
      method: 'POST',
      headers: { Authorization: 'Bearer runtime-test-owner' },
      body: JSON.stringify({ operation: 'accept', missionId: first.body.mission.id, approved: true })
    });
    assert.equal(authenticatedButPremature.response.status, 400);
    assert.match(authenticatedButPremature.body.error, /VERIFIED/i);
  });
});

test('presence enrollment is owner-gated and defaults sensors to ASK', async () => {
  await withRuntime(async (base) => {
    const profile = {
      surface: 'phone',
      deviceId: 'test-phone',
      inputPreferences: ['touch', 'voice'],
      accessibilityNeeds: ['reduced-motion']
    };

    const denied = await jsonRequest(`${base}/api/guardian/presence/enroll`, {
      method: 'POST', body: JSON.stringify(profile)
    });
    assert.equal(denied.response.status, 401);

    const enrolled = await jsonRequest(`${base}/api/guardian/presence/enroll`, {
      method: 'POST',
      headers: { Authorization: 'Bearer runtime-test-owner' },
      body: JSON.stringify(profile)
    });
    assert.equal(enrolled.response.status, 201);
    assert.deepEqual(enrolled.body.profile.sensors, {
      microphone: 'ASK', camera: 'ASK', screen: 'ASK', location: 'ASK'
    });
    assert.equal(enrolled.body.profile.ambientSurveillance, false);

    const presence = await jsonRequest(`${base}/api/guardian/presence`);
    assert.equal(presence.response.status, 200);
    assert.equal(presence.body.activeSurfaces.length, 1);
    assert.equal(presence.body.activeSurfaces[0].presentation.mode, 'compact-presence');
    assert.equal(presence.body.activeSurfaces[0].presentation.reducedMotion, true);
  });
});
