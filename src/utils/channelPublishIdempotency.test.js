import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync(new URL('../services/api.js', import.meta.url), 'utf8');
const screen = fs.readFileSync(new URL('../screens/ChannelsScreen.js', import.meta.url), 'utf8');
test('channel post API sends an optional client request ID', () => {
  assert.match(api, /publishChannelPost\(channelId, body, clientRequestId = null\)/);
  assert.match(api, /payload\.clientRequestId = clientRequestId/);
});
test('channel composer persists retry identity before publishing and guards concurrent taps', () => {
  assert.match(screen, /getChannelPublishRequest\(AsyncStorage, requestKey, body\)/);
  assert.match(screen, /publishRequestIdRef\.current = requestId/);
  assert.match(screen, /publishingRef\.current\) return/);
  assert.match(screen, /publishChannelPost\(selected\.id, body, requestId\)/);
  assert.match(screen, /markChannelPublishRequestComplete\(AsyncStorage, requestKey\)/);
  assert.match(screen, /clearChannelPublishRequest\(AsyncStorage, requestKey\)/);
});
