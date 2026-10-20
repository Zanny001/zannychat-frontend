import test from 'node:test';
import assert from 'node:assert/strict';

function eligibleExpiredRows(rows, userId, now) {
  const cutoff = new Date(now).getTime();
  return rows.filter((row) => row.user_id === userId && Number.isFinite(new Date(row.expires_at).getTime()) && new Date(row.expires_at).getTime() <= cutoff);
}

test("expiry cleanup selects only the signed-in user's expired statuses", () => {
  const rows = [
    { id: 'a', user_id: 'me', expires_at: '2026-01-01T00:00:00Z' },
    { id: 'b', user_id: 'other', expires_at: '2026-01-01T00:00:00Z' },
    { id: 'c', user_id: 'me', expires_at: '2027-01-01T00:00:00Z' },
  ];
  assert.deepEqual(eligibleExpiredRows(rows, 'me', '2026-06-01T00:00:00Z').map((row) => row.id), ['a']);
});

test('expiry cleanup treats expiry boundary as expired and ignores invalid timestamps', () => {
  const rows = [
    { id: 'a', user_id: 'me', expires_at: '2026-06-01T00:00:00Z' },
    { id: 'b', user_id: 'me', expires_at: 'not-a-date' },
  ];
  assert.deepEqual(eligibleExpiredRows(rows, 'me', '2026-06-01T00:00:00Z').map((row) => row.id), ['a']);
});
