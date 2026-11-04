import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePollPageArgs, slicePollPage, createPollCursor, validatePollCursor } from './pollPagination.js';

test('poll pagination accepts bounded valid offsets and limits for legacy callers', () => {
  assert.deepEqual(validatePollPageArgs(), { offset: 0, limit: 40 });
  assert.deepEqual(validatePollPageArgs(80, 100), { offset: 80, limit: 100 });
});

test('poll pagination rejects negative, fractional and unsafe offsets', () => {
  for (const value of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN]) assert.throws(() => validatePollPageArgs(value, 20));
});

test('poll pagination rejects limits outside the supported range', () => {
  for (const value of [0, -1, 101, 1.2, NaN]) assert.throws(() => validatePollPageArgs(0, value));
});

const poll = (id, created_at) => ({ id, created_at });
const a = poll('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2026-10-23T10:00:00.000Z');
const b = poll('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '2026-10-22T10:00:00.000Z');
const c = poll('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '2026-10-21T10:00:00.000Z');

test('poll page slices look-ahead row and cursor uses last visible row', () => {
  const page = slicePollPage([a, b, c], 10, 2);
  assert.equal(page.hasMore, true);
  assert.deepEqual(page.polls, [a, b]);
  assert.equal(page.nextOffset, 12);
  assert.deepEqual(page.nextCursor, { id: b.id, created_at: b.created_at });
  assert.deepEqual(slicePollPage([], 12, 2), { polls: [], hasMore: false, nextOffset: 12, nextCursor: null });
});

test('poll cursor validation rejects malformed IDs and timestamps', () => {
  assert.deepEqual(validatePollCursor(null), null);
  assert.deepEqual(validatePollCursor(createPollCursor(a)), { id: a.id, created_at: a.created_at });
  assert.equal(createPollCursor({ id: 'not-a-uuid', created_at: a.created_at }), null);
  assert.throws(() => validatePollCursor({ id: 'not-a-uuid', created_at: a.created_at }), /cursor is invalid/);
  assert.throws(() => validatePollCursor({ id: a.id, created_at: 'invalid' }), /cursor is invalid/);
});
