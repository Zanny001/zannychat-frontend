import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEventPageArgs, createEventCursor, validateEventCursor, sliceEventPage } from './eventPagination.js';

const event = (id, starts_at) => ({ id, starts_at });
const a = event('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2026-11-20T10:00:00.000Z');
const b = event('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '2026-11-21T10:00:00.000Z');
const c = event('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '2026-11-22T10:00:00.000Z');

test('event pagination accepts bounded page sizes', () => {
  assert.deepEqual(validateEventPageArgs(), { limit: 40 });
  assert.deepEqual(validateEventPageArgs(100), { limit: 100 });
  for (const limit of [0, -1, 101, 1.5, NaN]) assert.throws(() => validateEventPageArgs(limit));
});

test('event cursors use the final visible row and preserve ascending order', () => {
  const page = sliceEventPage([a, b, c], 2);
  assert.deepEqual(page.events, [a, b]);
  assert.equal(page.hasMore, true);
  assert.deepEqual(page.nextCursor, { id: b.id, starts_at: b.starts_at });
  assert.deepEqual(validateEventCursor(createEventCursor(b)), { id: b.id, starts_at: b.starts_at });
});

test('event cursor validation rejects malformed IDs and timestamps', () => {
  assert.deepEqual(validateEventCursor(null), null);
  assert.equal(createEventCursor({ id: 'not-a-uuid', starts_at: a.starts_at }), null);
  assert.throws(() => validateEventCursor({ id: 'not-a-uuid', starts_at: a.starts_at }), /cursor is invalid/);
  assert.throws(() => validateEventCursor({ id: a.id, starts_at: 'not-a-date' }), /cursor is invalid/);
});

test('event pagination handles empty and exact-size pages', () => {
  assert.deepEqual(sliceEventPage([], 2), { events: [], hasMore: false, nextCursor: null });
  assert.deepEqual(sliceEventPage([a, b], 2), { events: [a, b], hasMore: false, nextCursor: { id: b.id, starts_at: b.starts_at } });
});
