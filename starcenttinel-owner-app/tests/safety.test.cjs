const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const status = fs.readFileSync('src/status.js', 'utf8');
const dashboard = fs.readFileSync('src/Dashboard.js', 'utf8');
test('offline state is explicitly non-live', () => {
 assert.match(status, /live: false/);
 assert.match(status, /OFFLINE · NOT LIVE/);
});
test('no emergency capability is enabled', () => {
 assert.match(status, /LIVE_CONTROLS_ENABLED = false/);
 assert.match(dashboard, /live controls remain disabled/);
});
test('green all-online claim requires live data', () => {
 assert.doesNotMatch(dashboard, /ALL SYSTEMS ONLINE/);
 assert.match(dashboard, /status.source\?\.live/);
});
test('no hardcoded client API credentials', () => {
 for (const file of ['App.js','src/status.js','src/Dashboard.js']) {
  const source = fs.readFileSync(file, 'utf8');
  assert.doesNotMatch(source, /(?:service_role|sb_secret_|sk_live_)[A-Za-z0-9_-]{12,}/);
 }
});
