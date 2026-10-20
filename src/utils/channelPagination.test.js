import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeChannelPostPages } from './channelPagination.js';

test('merges pages without duplicate post IDs and preserves newer data', () => {
  const merged = mergeChannelPostPages(
    [{ id: 'a', body: 'old', created_at: '2026-01-01T00:00:00Z' }],
    [{ id: 'a', body: 'edited', created_at: '2026-01-01T00:00:00Z' }, { id: 'b', body: 'older', created_at: '2025-12-31T00:00:00Z' }],
  );
  assert.equal(merged.length, 2);
  assert.equal(merged.find((post) => post.id === 'a').body, 'edited');
  assert.equal(merged[1].id, 'b');
});

test('pinned posts sort first while other posts retain descending chronological order', () => {
  const merged = mergeChannelPostPages([], [
    { id: 'new', created_at: '2026-03-03T00:00:00Z', is_pinned: false },
    { id: 'pin-old', created_at: '2026-02-01T00:00:00Z', is_pinned: true },
    { id: 'middle', created_at: '2026-03-02T00:00:00Z', is_pinned: false },
  ]);
  assert.deepEqual(merged.map((post) => post.id), ['pin-old', 'new', 'middle']);
});

test('ignores malformed posts and safely handles missing page arrays', () => {
  assert.deepEqual(mergeChannelPostPages(null, [null, {}, { id: 'valid', created_at: '2026-01-01T00:00:00Z' }]).map((post) => post.id), ['valid']);
  assert.deepEqual(mergeChannelPostPages(undefined, undefined), []);
});
