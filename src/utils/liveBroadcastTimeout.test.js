import test from 'node:test';
import assert from 'node:assert/strict';
import { LIVE_BROADCAST_MAX_DURATION_MS, LIVE_BROADCAST_WARNING_MS, formatLiveBroadcastTimeRemaining, getLiveBroadcastTimeRemaining } from './liveBroadcastTimeout.js';

test('LIVE timeout countdown derives from the authoritative stream start timestamp', () => {
  const now = Date.parse('2026-11-19T12:00:00.000Z');
  assert.equal(getLiveBroadcastTimeRemaining('2026-11-19T11:00:00.000Z', now), 3 * 60 * 60 * 1000);
  assert.equal(getLiveBroadcastTimeRemaining('invalid', now), null);
  assert.equal(getLiveBroadcastTimeRemaining(null, now), null);
});

test('LIVE timeout countdown clamps at zero and exposes the 10-minute warning threshold', () => {
  const now = Date.parse('2026-11-19T12:00:00.000Z');
  assert.equal(getLiveBroadcastTimeRemaining('2026-11-19T07:00:00.000Z', now), 0);
  assert.equal(LIVE_BROADCAST_MAX_DURATION_MS - LIVE_BROADCAST_WARNING_MS, 3 * 60 * 60 * 1000 + 50 * 60 * 1000);
});

test('LIVE timeout countdown formats hours, minutes and seconds consistently', () => {
  assert.equal(formatLiveBroadcastTimeRemaining(3 * 60 * 60 * 1000 + 9 * 60 * 1000 + 8 * 1000), '03:09:08');
  assert.equal(formatLiveBroadcastTimeRemaining(9 * 60 * 1000 + 8 * 1000), '00:09:08');
  assert.equal(formatLiveBroadcastTimeRemaining(0), '00:00:00');
});
