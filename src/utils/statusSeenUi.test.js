import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('../screens/StatusUpdatesScreen.js', import.meta.url), 'utf8');

test('Status feed loads local seen state and marks opened statuses as seen', () => {
  assert.match(screen, /readSeenStatusIds\(AsyncStorage\)/);
  assert.match(screen, /markStatusSeen\(seenStatusIdsRef\.current, item\.id\)/);
  assert.match(screen, /zannychat\.status-seen\.v1/);
});

test('grouped contact stories expose accessible unread counts', () => {
  assert.match(screen, /unreadStatusCount\(group\.statuses, seenStatusIds, false\)/);
  assert.match(screen, /new status updates/);
  assert.match(screen, /unreadStatusCount\(group\.statuses, seenStatusIds, item\.is_own\)/);
});

test('grouped story open actions select the first unseen update', () => {
  assert.match(screen, /firstUnseenStatus\(group\.statuses, seenStatusIds, item\)/);
  assert.match(screen, /const openGroupStatus = \(\) => openStatus\(item\.is_own \? item : firstUnseenStatus/);
  assert.match(screen, /onPress=\{openGroupStatus\}/);
});

test('own status groups retain latest-item behavior', () => {
  assert.match(screen, /item\.is_own \? item : firstUnseenStatus/);
});

test('status refresh reconciles persisted read markers against active statuses', () => {
  assert.match(screen, /retainActiveSeenStatusIds\(seenStatusIdsRef\.current, rows\)/);
  assert.match(screen, /AsyncStorage\.setItem\('zannychat\.status-seen\.v1', JSON\.stringify\(activeSeenIds\)\)/);
});


test('Status feed offers an accessible bulk viewed action when contact statuses are unread', () => {
  assert.match(screen, /markAllContactStatusesSeen/);
  assert.match(screen, /Mark all contact statuses as viewed/);
  assert.match(screen, /markStatusesSeen\(seenStatusIdsRef\.current, contactStatuses\)/);
});
