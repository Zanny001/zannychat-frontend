import test from 'node:test';
import assert from 'node:assert/strict';
import { buildContactQr, isContactUuid, parseContactQr } from './contactQr.js';

const USER_ID = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';

test('builds and parses a ZannyChat contact QR payload', () => {
  const payload = buildContactQr(USER_ID);
  assert.equal(payload, `zannychat://contact/${USER_ID}`);
  assert.equal(parseContactQr(payload), USER_ID);
});

test('rejects invalid UUIDs, other schemes, and unrelated QR codes', () => {
  assert.equal(isContactUuid('not-a-uuid'), false);
  assert.equal(buildContactQr('not-a-uuid'), null);
  assert.equal(parseContactQr('https://example.com/contact/6ba7b810-9dad-41d1-80b4-00c04fd430c8'), null);
  assert.equal(parseContactQr('zannychat://other/6ba7b810-9dad-41d1-80b4-00c04fd430c8'), null);
  assert.equal(parseContactQr('zannychat://contact/not-a-uuid'), null);
  assert.equal(parseContactQr(null), null);
});
