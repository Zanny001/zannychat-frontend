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


test('expired status cleanup batch remains scoped to one owner and excludes pending media paths', () => {
  const rows = [
    { id: 'a', user_id: 'me', media_path: 'me/a/photo.jpg', expires_at: '2026-01-01T00:00:00Z' },
    { id: 'b', user_id: 'me', media_path: 'pending', expires_at: '2026-01-01T00:00:00Z' },
    { id: 'c', user_id: 'other', media_path: 'other/c/photo.jpg', expires_at: '2026-01-01T00:00:00Z' },
  ];
  const eligible = eligibleExpiredRows(rows, 'me', '2026-06-01T00:00:00Z');
  assert.deepEqual(eligible.map((row) => row.id), ['a', 'b']);
  assert.deepEqual(eligible.map((row) => row.media_path).filter((path) => path && path !== 'pending'), ['me/a/photo.jpg']);
});

test('invalid or missing media paths do not become storage deletion targets', () => {
  const rows = [
    { id: 'a', user_id: 'me', media_path: null, expires_at: '2026-01-01T00:00:00Z' },
    { id: 'b', user_id: 'me', media_path: 'pending', expires_at: '2026-01-01T00:00:00Z' },
  ];
  const eligible = eligibleExpiredRows(rows, 'me', '2026-06-01T00:00:00Z');
  assert.deepEqual(eligible.map((row) => row.media_path).filter((path) => path && path !== 'pending'), []);
});
