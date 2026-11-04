import test from 'node:test';
import assert from 'node:assert/strict';
import { filterChannelDirectory, getChannelDirectoryCounts } from './channelDirectory.js';

const rows = [
  { id: 'a', title: 'Alpha', subscribed: false, subscriberCount: 4, created_at: '2026-01-01T00:00:00Z' },
  { id: 'b', title: 'Beta', subscribed: true, subscriberCount: 90, created_at: '2026-03-01T00:00:00Z' },
  { id: 'c', title: 'Gamma', subscribed: true, subscriberCount: 90, created_at: '2026-02-01T00:00:00Z' },
];

test('directory filters subscribed channels without mutating the source array', () => {
  const result = filterChannelDirectory(rows, 'subscribed');
  assert.deepEqual(result.map((row) => row.id), ['b', 'c']);
  assert.deepEqual(rows.map((row) => row.id), ['a', 'b', 'c']);
});

test('popular sorting ranks subscriber count descending and is stable for ties', () => {
  assert.deepEqual(filterChannelDirectory(rows, 'popular').map((row) => row.id), ['b', 'c', 'a']);
});

test('newest sorting uses valid creation dates and keeps stable order for missing dates', () => {
  assert.deepEqual(filterChannelDirectory(rows, 'newest').map((row) => row.id), ['b', 'c', 'a']);
  assert.deepEqual(filterChannelDirectory([{ id: 'x' }, { id: 'y' }], 'newest').map((row) => row.id), ['x', 'y']);
});

test('invalid modes fall back to all and malformed rows are ignored', () => {
  assert.deepEqual(filterChannelDirectory([null, {}, { id: 'x' }], 'unexpected').map((row) => row.id), ['x']);
  assert.deepEqual(filterChannelDirectory(null), []);
});

test('directory counts include only valid rows and subscribed channels', () => {
  assert.deepEqual(getChannelDirectoryCounts([...rows, null]), { all: 3, subscribed: 2, recent: 0 });
});


test('recent filter follows persisted visit order and ignores channels absent from current results', () => {
  assert.deepEqual(filterChannelDirectory(rows, 'recent', ['c', 'missing', 'a']).map((row) => row.id), ['c', 'a']);
});

test('recent directory count reflects only visible server rows', () => {
  assert.deepEqual(getChannelDirectoryCounts(rows, ['c', 'missing', 'a']), { all: 3, subscribed: 2, recent: 2 });
});
