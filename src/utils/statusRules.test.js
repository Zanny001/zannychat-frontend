import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStatusExpiryHours, statusExpiryFrom, STATUS_EXPIRY_OPTIONS_HOURS } from './statusRules.js';

test('status expiry accepts the audited 6, 12, 24 and 48 hour durations', () => {
  assert.deepEqual(STATUS_EXPIRY_OPTIONS_HOURS, [6, 12, 24, 48]);
  for (const hours of STATUS_EXPIRY_OPTIONS_HOURS) assert.equal(normalizeStatusExpiryHours(hours), hours);
});

test('status expiry is calculated from creation time using the selected duration', () => {
  const createdAt = '2026-10-23T10:00:00.000Z';
  assert.equal(statusExpiryFrom(createdAt, 6), '2026-10-23T16:00:00.000Z');
  assert.equal(statusExpiryFrom(createdAt, 12), '2026-10-23T22:00:00.000Z');
  assert.equal(statusExpiryFrom(createdAt, 24), '2026-10-24T10:00:00.000Z');
  assert.equal(statusExpiryFrom(createdAt, 48), '2026-10-25T10:00:00.000Z');
});

test('status expiry rejects unsupported lifetimes and invalid timestamps', () => {
  assert.throws(() => statusExpiryFrom('2026-10-23T10:00:00Z', 7), /Status expiry must be one of/);
  assert.throws(() => statusExpiryFrom('not-a-date', 24), /Invalid status creation time/);
});
