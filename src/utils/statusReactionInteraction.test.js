import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('status reaction actions serialize taps per status and refresh only active statuses', async () => {
  const source = await readFile(new URL('../screens/StatusUpdatesScreen.js', import.meta.url), 'utf8');
  assert.match(source, /reactionLocksRef = useRef\(new Set\(\)\)/);
  assert.match(source, /reactionLocksRef\.current\.has\(statusId\)/);
  assert.match(source, /reactionLocksRef\.current\.add\(statusId\)/);
  assert.match(source, /finally \{\s*reactionLocksRef\.current\.delete\(statusId\)/);
  assert.match(source, /statuses\.filter\(\(row\) => isStatusActiveAt\(row\)\)\.map\(\(row\) => row\.id\)/);
});

test('status reaction controls expose selected and disabled state and retain accessible touch targets', async () => {
  const source = await readFile(new URL('../screens/StatusUpdatesScreen.js', import.meta.url), 'utf8');
  assert.match(source, /accessibilityLabel="Status reactions"/);
  assert.match(source, /accessibilityState=\{\{ selected: mine, disabled: busy \}\}/);
  assert.match(source, /minWidth: 44, minHeight: 44/);
  assert.match(source, /onPress=\{\(\) => toggleStatusReaction\(viewing\.id, emoji, mine\)\}/);
});
