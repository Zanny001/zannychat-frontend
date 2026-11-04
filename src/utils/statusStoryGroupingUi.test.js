import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('../screens/StatusUpdatesScreen.js', import.meta.url), 'utf8');

test('Status feed renders grouped story entries with owner and update count', () => {
  assert.match(screen, /groupStatusUpdates\(statuses\)/);
  assert.match(screen, /groupedStatuses\.map\(\(group\)/);
  assert.match(screen, /group\.statuses\.length/);
  assert.match(screen, /group\.latest/);
});

test('opening a grouped story still opens an individual status item', () => {
  assert.match(screen, /onPress=\{openGroupStatus\}/);
  assert.match(screen, /firstUnseenStatus\(group\.statuses, seenStatusIds, item\)/);
  assert.match(screen, /getAdjacentStoryStatus\(statuses, viewing\.id/);
});
