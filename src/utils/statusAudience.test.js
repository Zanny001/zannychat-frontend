import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStatusAudience } from './statusAudience.js';

test('supports contacts and only-me audiences without recipient IDs', () => {
  assert.deepEqual(normalizeStatusAudience('contacts'), []);
  assert.deepEqual(normalizeStatusAudience('only_me'), []);
});

test('deduplicates selected audience IDs and trims malformed whitespace', () => {
  assert.deepEqual(normalizeStatusAudience('selected_contacts', [' alice ', 'bob', 'alice', '', null]), ['alice', 'bob']);
});

test('selected audience requires at least one recipient', () => {
  assert.throws(() => normalizeStatusAudience('selected_contacts', []), /at least one contact/);
});

test('rejects recipient IDs for non-selected audiences and unknown modes', () => {
  assert.throws(() => normalizeStatusAudience('contacts', ['alice']), /only valid/);
  assert.throws(() => normalizeStatusAudience('everyone'), /valid status audience/);
});
