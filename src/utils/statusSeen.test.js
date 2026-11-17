import test from 'node:test';
import assert from 'node:assert/strict';
import { firstUnseenStatus, getSeenStatusStorageKey, markStatusSeen, markStatusesSeen, normalizeSeenStatusIds, readSeenStatusIds, retainActiveSeenStatusIds, unreadStatusCount, writeSeenStatusIds } from './statusSeen.js';

test('normalizes seen IDs, removes duplicates, and ignores invalid values', () => {
  assert.deepEqual(normalizeSeenStatusIds(['a', 'a', '', null, ' b ']), ['a', 'b']);
});

test('marks a status seen without duplicating it', () => {
  assert.deepEqual(markStatusSeen(['a'], 'a'), ['a']);
  assert.deepEqual(markStatusSeen(['a'], 'b'), ['a', 'b']);
});

test('marks all IDs in a status group seen without duplicates or invalid IDs', () => {
  assert.deepEqual(markStatusesSeen(['seen'], [{ id: 'new' }, { id: 'seen' }, {}, { id: 'next' }]), ['seen', 'new', 'next']);
  assert.deepEqual(markStatusesSeen(['seen'], null), ['seen']);
});

test('stores and reads seen IDs under a user-specific key', async () => {
  const values = new Map();
  const storage = {
    async getItem(key) { return values.get(key) ?? null; },
    async setItem(key, value) { values.set(key, value); },
    async removeItem(key) { values.delete(key); },
  };
  assert.equal(getSeenStatusStorageKey(''), null);
  assert.equal(getSeenStatusStorageKey('user-a'), 'zannychat.status-seen.v1.user-a');
  assert.equal(await writeSeenStatusIds(storage, 'user-a', ['s1', 's1']), true);
  assert.deepEqual(await readSeenStatusIds(storage, 'user-a'), ['s1']);
  assert.deepEqual(await readSeenStatusIds(storage, 'user-b'), []);
});

test('does not migrate the legacy global seen marker to an account', async () => {
  const values = new Map([['zannychat.status-seen.v1', '["legacy"]']]);
  const storage = {
    async getItem(key) { return values.get(key) ?? null; },
    async removeItem(key) { values.delete(key); },
  };
  assert.deepEqual(await readSeenStatusIds(storage, 'user-a'), []);
  assert.equal(values.has('zannychat.status-seen.v1'), false);
  assert.deepEqual(await readSeenStatusIds(null, 'user-a'), []);
  assert.deepEqual(await readSeenStatusIds({ getItem: async () => 'not-json' }, 'user-a'), []);
});

test('counts unread statuses in a group and never marks own statuses unread', () => {
  const statuses = [{ id: '1' }, { id: '2' }, { id: '3' }];
  assert.equal(unreadStatusCount(statuses, ['2']), 2);
  assert.equal(unreadStatusCount(statuses, ['2'], true), 0);
});

test('opens the oldest unseen update first and falls back when all are seen', () => {
  const statuses = [
    { id: 'new', created_at: '2026-10-22T10:00:00Z' },
    { id: 'middle', created_at: '2026-10-22T09:00:00Z' },
    { id: 'old', created_at: '2026-10-22T08:00:00Z' },
  ];
  assert.equal(firstUnseenStatus(statuses, ['new']).id, 'old');
  assert.equal(firstUnseenStatus(statuses, ['new', 'old']).id, 'middle');
  assert.equal(firstUnseenStatus(statuses, ['new', 'middle', 'old'], statuses[0]).id, 'new');
  assert.equal(firstUnseenStatus([], [], statuses[0]).id, 'new');
});

test('active-status reconciliation removes expired and deleted read markers', () => {
  assert.deepEqual(retainActiveSeenStatusIds(['active', 'expired', 'active', 'unknown'], [{ id: 'active' }]), ['active']);
});

test('active-status reconciliation is safe when the feed is empty or unavailable', () => {
  assert.deepEqual(retainActiveSeenStatusIds(['old'], []), []);
  assert.deepEqual(retainActiveSeenStatusIds(['old', 'old'], null), ['old']);
});
