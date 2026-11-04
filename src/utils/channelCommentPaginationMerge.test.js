import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeChannelCommentPages } from './channelCommentPagination.js';

test('merges older and newer pages in chronological order', () => {
  const newer = [{ id: 'c3', created_at: '2026-10-23T10:00:00.000Z' }];
  const older = [
    { id: 'c1', created_at: '2026-10-23T08:00:00.000Z' },
    { id: 'c2', created_at: '2026-10-23T09:00:00.000Z' },
  ];
  assert.deepEqual(mergeChannelCommentPages(newer, older).map((row) => row.id), ['c1', 'c2', 'c3']);
});

test('deduplicates overlapping pages and lets incoming records refresh existing ones', () => {
  const existing = [
    { id: 'c1', created_at: '2026-10-23T08:00:00.000Z', body: 'old body' },
    { id: 'c2', created_at: '2026-10-23T09:00:00.000Z', body: 'keep' },
  ];
  const incoming = [
    { id: 'c1', created_at: '2026-10-23T08:00:00.000Z', body: 'edited body' },
    { id: 'c3', created_at: '2026-10-23T10:00:00.000Z', body: 'new' },
  ];
  const merged = mergeChannelCommentPages(existing, incoming);
  assert.equal(merged.length, 3);
  assert.equal(merged[0].body, 'edited body');
  assert.deepEqual(merged.map((row) => row.id), ['c1', 'c2', 'c3']);
});

test('orders equal timestamps by ID and ignores malformed rows', () => {
  const rows = mergeChannelCommentPages(
    [{ id: 'b', created_at: '2026-10-23T10:00:00Z' }, null, { created_at: 'bad' }],
    [{ id: 'a', created_at: '2026-10-23T10:00:00Z' }, { id: '', created_at: 'bad' }],
  );
  assert.deepEqual(rows.map((row) => row.id), ['a', 'b']);
});

test('handles missing page arrays safely', () => {
  assert.deepEqual(mergeChannelCommentPages(null, undefined), []);
});
