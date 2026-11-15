import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync(new URL('./api.js', import.meta.url), 'utf8');

test('chat media upload service enforces the same 25 MiB cap as Storage', () => {
  assert.ok(api.includes('const MAX_CHAT_MEDIA_BYTES = 25 * 1024 * 1024'));
  assert.ok(api.includes('arrayBuffer.byteLength > MAX_CHAT_MEDIA_BYTES'));
  assert.ok(api.includes('Number.isFinite(declaredSize) && declaredSize > MAX_CHAT_MEDIA_BYTES'));
  assert.ok(api.includes('Chat attachments are limited to 25 MB'));
  assert.ok(api.includes('Voice notes are limited to 25 MB'));
});
