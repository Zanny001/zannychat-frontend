import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeChannelPost, normalizeChannelTitle, validateChannel } from './channelValidation.js';

test('channel titles normalize whitespace and enforce the length bounds', () => {
  assert.equal(normalizeChannelTitle('  News   Daily  '), 'News Daily');
  assert.equal(validateChannel({ title: 'x' }).ok, false);
  assert.equal(validateChannel({ title: 'A valid channel' }).ok, true);
  assert.equal(normalizeChannelTitle('a'.repeat(80)).length, 60);
});

test('channel descriptions are bounded and must be strings', () => {
  assert.equal(validateChannel({ title: 'News', description: 'x'.repeat(501) }).ok, false);
  assert.equal(validateChannel({ title: 'News', description: 42 }).ok, false);
});

test('channel posts are trimmed and bounded', () => {
  assert.equal(normalizeChannelPost('  Hello  '), 'Hello');
  assert.equal(normalizeChannelPost('x'.repeat(4500)).length, 4000);
  assert.equal(normalizeChannelPost('   '), '');
});
