import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('status feed subscribes to status row changes and cleans up its channel', async () => {
  const source = await readFile(new URL('../services/statusUpdates.js', import.meta.url), 'utf8');
  assert.match(source, /subscribeToStatusChanges/);
  assert.match(source, /postgres_changes/);
  assert.match(source, /table: 'status_updates'/);
  assert.match(source, /removeChannel\(channel\)/);
});

test('status screen refreshes from realtime events with debounce and unsubscribes on blur', async () => {
  const source = await readFile(new URL('../screens/StatusUpdatesScreen.js', import.meta.url), 'utf8');
  assert.match(source, /subscribeToStatusChanges/);
  assert.match(source, /setTimeout\(\(\) => \{ refreshTimer = null; refresh\(\); \}, 350\)/);
  assert.match(source, /unsubscribe\(\)/);
});
