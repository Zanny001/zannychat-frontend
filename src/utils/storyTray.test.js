import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStoryTrayGroups } from './storyTray.js';

test('groups active statuses by owner and places the current user first', () => {
  const statuses = [
    { id: 'peer-1', user_id: 'peer', is_own: false, created_at: '2026-11-12T10:00:00Z' },
    { id: 'own-1', user_id: 'me', is_own: true, created_at: '2026-11-12T11:00:00Z' },
    { id: 'peer-2', user_id: 'peer', is_own: false, created_at: '2026-11-12T09:00:00Z' },
  ];
  const groups = buildStoryTrayGroups(statuses, { peer: 'A friend' }, ['peer-1']);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].userId, 'me');
  assert.equal(groups[0].name, 'Your story');
  assert.equal(groups[1].userId, 'peer');
  assert.equal(groups[1].name, 'A friend');
  assert.equal(groups[1].count, 2);
  assert.equal(groups[1].unseenCount, 1);
});

test('does not count own stories as unread and uses a safe fallback name', () => {
  const groups = buildStoryTrayGroups([
    { id: 'own-1', user_id: 'me', is_own: true },
    { id: 'peer-1', user_id: 'peer', is_own: false },
  ], {}, []);
  assert.equal(groups[0].unseenCount, 0);
  assert.equal(groups[1].name, 'ZannyChat user');
  assert.equal(groups[1].unseenCount, 1);
});

test('ignores malformed status records and handles missing input safely', () => {
  assert.deepEqual(buildStoryTrayGroups(null, {}, []), []);
  assert.deepEqual(buildStoryTrayGroups([null, {}, { id: 'missing-owner' }], {}, []), []);
});
