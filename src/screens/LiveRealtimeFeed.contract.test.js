const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const native = fs.readFileSync(path.join(__dirname, 'LiveStreamScreen.js'), 'utf8');
const web = fs.readFileSync(path.join(__dirname, 'LiveStreamScreen.web.js'), 'utf8');

test('native and web LIVE clients consume only versioned feed invalidation packets', () => {
  for (const source of [native, web]) {
    assert.match(source, /topic !== 'zanny\.live\.feed\.v1'/);
    assert.match(source, /event\?\.v === 1 && event\?\.type === 'feed_changed'/);
    assert.match(source, /payload\.length > 512/);
    assert.match(source, /RoomEvent\.DataReceived/);
    assert.match(source, /RoomEvent\.Reconnected/);
  }
  assert.match(native, /onRealtimeFeedSignal=\{refreshComments\}/);
  assert.match(native, /onRealtimeFeedSignal\?\./);
});

test('LIVE feed invalidations trigger authenticated refresh while polling remains a slower fallback', () => {
  assert.match(native, /if \(isLiveFeedInvalidation\(payload, topic\)\) onRealtimeFeedSignal\?\.\(\)/);
  assert.match(web, /if \(isLiveFeedInvalidation\(payload, topic\)\) refreshComments\(\)/);
  assert.match(native, /setInterval\(refreshComments, 30_000\)/);
  assert.match(web, /setInterval\(refreshComments, 30_000\)/);
  assert.match(native, /backendFetch\(`\/live\/\$\{stream\.id\}\/comments`\)/);
  assert.match(web, /backendFetch\(`\/live\/\$\{stream\.id\}\/comments`\)/);
});

test('LIVE feed packets never render untrusted data directly or enable client data publishing', () => {
  for (const source of [native, web]) {
    assert.match(source, /JSON\.parse\(String\.fromCharCode\(\.\.\.Array\.from\(payload\)\)\)/);
    assert.doesNotMatch(source, /publishData\s*\(/);
  }
});
