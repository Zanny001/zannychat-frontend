import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync(new URL('./api.js', import.meta.url), 'utf8');

test('sendMessage can bind queued sends to the authenticated user that created them', () => {
  assert.match(api, /sendMessage\(conversationId, text, replyToId = null, requestId = null, expectedUserId = null\)/);
  assert.match(api, /if \(expectedUserId && userId !== expectedUserId\)/);
  assert.match(api, /AUTH_USER_CHANGED/);
});
