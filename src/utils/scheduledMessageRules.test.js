import test from 'node:test';
import assert from 'node:assert/strict';
import { localDateTimeInput, normalizeScheduledDate, validateScheduledMessageText } from './scheduledMessageRules.js';

test('localDateTimeInput creates a device-local minute precision value', () => {
  const value = localDateTimeInput(new Date(2030, 0, 2, 3, 4));
  assert.equal(value, '2030-01-02T03:04');
  assert.throws(() => localDateTimeInput(new Date(Number.NaN)), /valid local date/);
  assert.throws(() => localDateTimeInput(null), /valid local date/);
});

test('scheduled date accepts a time at least one minute ahead', () => {
  const now = Date.parse('2030-01-01T00:00:00Z');
  assert.equal(normalizeScheduledDate('2030-01-01T00:01:00Z', now), '2030-01-01T00:01:00.000Z');
});

test('scheduled date rejects invalid, too-soon, and beyond-30-day times', () => {
  const now = Date.parse('2030-01-01T00:00:00Z');
  assert.throws(() => normalizeScheduledDate('not a date', now), /valid local date/);
  assert.throws(() => normalizeScheduledDate('2030-02-30T12:00', now), /valid local date/);
  assert.throws(() => normalizeScheduledDate('2030-13-01T12:00', now), /valid local date/);
  assert.throws(() => normalizeScheduledDate('2030-01-01T12:00:00+14:01', now), /valid local date/);
  assert.throws(() => normalizeScheduledDate('2030-01-01T12:00:00+23:59', now), /valid local date/);
  assert.equal(normalizeScheduledDate('2030-01-02T12:00:00+14:00', now), '2030-01-01T22:00:00.000Z');
  assert.throws(() => normalizeScheduledDate('2030-01-01T25:00', now), /valid local date/);
  assert.equal(normalizeScheduledDate('2032-02-29T12:00:00Z', Date.parse('2032-02-29T11:00:00Z')), '2032-02-29T12:00:00.000Z');
  assert.equal(normalizeScheduledDate('0000-02-29T12:30:00Z', Date.parse('0000-02-28T12:30:00Z')), '0000-02-29T12:30:00.000Z');
  assert.throws(() => normalizeScheduledDate('2100-02-29T12:00:00Z', Date.parse('2100-02-01T00:00:00Z')), /valid local date/);
  assert.throws(() => normalizeScheduledDate('2030-01-01T00:01:00Z', Number.NaN), /valid local date/);
  assert.throws(() => normalizeScheduledDate('2030-01-01T00:01:00Z', 'not a clock'), /valid local date/);
  assert.throws(() => normalizeScheduledDate('2030-01-01T00:00:59Z', now), /at least one minute/);
  assert.throws(() => normalizeScheduledDate('2030-02-01T00:00:01Z', now), /up to 30 days/);
});

test('scheduled message text is trimmed and bounded to 4,000 characters', () => {
  assert.equal(validateScheduledMessageText('  hello  '), 'hello');
  assert.throws(() => validateScheduledMessageText('   '), /Write the message/);
  assert.throws(() => validateScheduledMessageText('x'.repeat(4001)), /4,000 characters/);
});
