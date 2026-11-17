import test from 'node:test';
import assert from 'node:assert/strict';
import { firstUnseenStatus, markStatusSeen, markStatusesSeen, normalizeSeenStatusIds, readSeenStatusIds, retainActiveSeenStatusIds, statusSeenStorageKey, unreadStatusCount, writeSeenStatusIds } from './statusSeen.js';

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

test('reads persisted seen IDs only from the authenticated account key', async () => {
  const values = new Map([['zannychat.status-seen.v2:user-a', '["s1","s1"]']]);
  const storage = { getItem: async (key) => values.get(key) || null };
  assert.deepEqual(await readSeenStatusIds(storage, 'user-a'), ['s1']);
  assert.deepEqual(await readSeenStatusIds(storage, 'user-b'), []);
  assert.deepEqual(await readSeenStatusIds({ getItem: async () => 'not-json' }, 'user-a'), []);
  assert.deepEqual(await readSeenStatusIds(storage, null), []);
  assert.deepEqual(await readSeenStatusIds(null, 'user-a'), []);
});

test('writes status read markers to distinct account-scoped keys', async () => {
  const values = new Map();
  const storage = { setItem: async (key, value) => values.set(key, value) };
  assert.equal(await writeSeenStatusIds(storage, 'user-a', ['s1', 's1', '']), true);
  assert.equal(await writeSeenStatusIds(storage, 'user-b', ['s2']), true);
  assert.deepEqual(JSON.parse(values.get('zannychat.status-seen.v2:user-a')), ['s1']);
  assert.deepEqual(JSON.parse(values.get('zannychat.status-seen.v2:user-b')), ['s2']);
  assert.equal(await writeSeenStatusIds(storage, null, ['s3']), false);
  assert.equal(statusSeenStorageKey('user-a'), 'zannychat.status-seen.v2:user-a');
  assert.equal(statusSeenStorageKey(null), null);
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
