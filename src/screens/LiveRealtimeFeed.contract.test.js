import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const native = fs.readFileSync(new URL('./LiveStreamScreen.js', import.meta.url), 'utf8');
const web = fs.readFileSync(new URL('./LiveStreamScreen.web.js', import.meta.url), 'utf8');

test('native and web LIVE clients consume only versioned feed invalidation packets', () => {
  for (const source of [native, web]) {
    assert.match(source, /topic !== 'zanny\.live\.feed\.v1'/);
    assert.match(source, /event\?\.v === 1 && event\?\.type === 'feed_changed'/);
    assert.match(source, /payload\.length > 512/);
    assert.match(source, /RoomEvent\.DataReceived/);
    assert.match(source, /RoomEvent\.Reconnected/);
  }
  assert.match(native, /onRealtimeFeedSignal=\{handleRealtimeFeedSignal\}/);
  assert.match(native, /onRealtimeFeedSignal\?\./);
});

test('LIVE feed invalidations trigger authenticated refresh while polling remains a slower fallback', () => {
  assert.match(native, /if \(isLiveFeedInvalidation\(payload, topic\)\) onRealtimeFeedSignal\?\.\(\)/);
  assert.match(web, /if \(isLiveFeedInvalidation\(payload, topic\)\) handleFeedSignal\(\)/);
  assert.match(native, /setInterval\(refreshComments, 30_000\)/);
  assert.match(native, /setLiveFeedSignal\(\(value\) => value \+ 1\)/);
  assert.match(web, /setInterval\(refreshComments, 30_000\)/);
  assert.match(web, /setLiveFeedSignal\(\(value\) => value \+ 1\)/);
  assert.match(native, /backendFetch\(`\/live\/\$\{stream\.id\}\/comments`\)/);
  assert.match(web, /backendFetch\(`\/live\/\$\{stream\.id\}\/comments`\)/);
});

test('LIVE feed packets never render untrusted data directly or enable client data publishing', () => {
  for (const source of [native, web]) {
    assert.match(source, /JSON\.parse\(String\.fromCharCode\(\.\.\.Array\.from\(payload\)\)\)/);
    assert.doesNotMatch(source, /publishData\s*\(/);
  }
});

test('LIVE refreshes queue a follow-up fetch when another event arrives during an in-flight request', () => {
  for (const source of [native, web]) {
    assert.match(source, /commentsRefreshQueued = useRef\(false\)/);
    assert.match(source, /commentsRefreshInFlight\.current\) \{ commentsRefreshQueued\.current = true; return; \}/);
    assert.match(source, /if \(commentsRefreshQueued\.current\)[\s\S]{0,180}void refreshComments\(\)/);
  }
});
