import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStatusText, statusExpiryFrom, STATUS_TEXT_LIMIT, STATUS_LIFETIME_MS } from './statusRules.js';

test('normalizes status text and enforces the character limit', () => {
  assert.equal(normalizeStatusText('  hello  '), 'hello');
  assert.equal(normalizeStatusText('  '), '');
  assert.equal(normalizeStatusText('x'.repeat(STATUS_TEXT_LIMIT + 5)).length, STATUS_TEXT_LIMIT);
});

test('status expires exactly 24 hours after its creation timestamp', () => {
  const created = '2026-01-01T12:00:00.000Z';
  assert.equal(new Date(statusExpiryFrom(created)).getTime(), new Date(created).getTime() + STATUS_LIFETIME_MS);
});

test('rejects invalid creation timestamps', () => {
  assert.throws(() => statusExpiryFrom('not-a-date'), /Invalid status creation time/);
});
