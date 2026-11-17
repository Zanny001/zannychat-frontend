import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./StatusUpdatesScreen.js', import.meta.url), 'utf8');

test('stories screen virtualizes recent status groups and the friends rail', () => {
  assert.match(source, /data=\{groupedStatuses\}/);
  assert.match(source, /data=\{friendStatusGroups\}/);
  assert.match(source, /keyExtractor=\{\(group\) => String\(group\.ownerId\)\}/);
  assert.doesNotMatch(source, /groupedStatuses\.map\(/);
  assert.doesNotMatch(source, /friendStatusGroups\.map\(/);
});

test('your story uses the account profile picture before falling back to status media', () => {
  assert.match(source, /myProfile\?\.avatarUrl/);
  assert.match(source, /ownStatusGroup\?\.latest\?\.media_url/);
});

test('recent statuses retain loading, retry, and empty states', () => {
  assert.match(source, /ListEmptyComponent=/);
  assert.match(source, /Refresh statuses/);
  assert.match(source, /No active statuses yet/);
});
