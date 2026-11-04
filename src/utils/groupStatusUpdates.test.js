import test from 'node:test';
import assert from 'node:assert/strict';
import { groupStatusUpdates } from './groupStatusUpdates.js';

test('groups multiple statuses by owner and uses the newest as the preview', () => {
  const grouped = groupStatusUpdates([
    { id: 'a1', user_id: 'alice', created_at: '2026-10-22T08:00:00Z' },
    { id: 'b1', user_id: 'bob', created_at: '2026-10-22T08:10:00Z' },
    { id: 'a2', user_id: 'alice', created_at: '2026-10-22T08:20:00Z' },
  ]);
  assert.equal(grouped.length, 2);
  assert.equal(grouped[0].ownerId, 'alice');
  assert.equal(grouped[0].latest.id, 'a2');
  assert.deepEqual(grouped[0].statuses.map((status) => status.id), ['a1', 'a2']);
  assert.equal(grouped[1].ownerId, 'bob');
});

test('does not merge statuses with missing owner IDs and ignores invalid rows', () => {
  const grouped = groupStatusUpdates([
    { id: 'one', created_at: '2026-10-22T08:00:00Z' },
    { id: 'two', created_at: '2026-10-22T08:01:00Z' },
    null,
    {},
  ]);
  assert.equal(grouped.length, 2);
  assert.notEqual(grouped[0].ownerId, grouped[1].ownerId);
});

test('returns an empty list for invalid input', () => {
  assert.deepEqual(groupStatusUpdates(null), []);
});
