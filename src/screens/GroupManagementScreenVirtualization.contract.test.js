import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./GroupManagementScreen.js', import.meta.url), 'utf8');

test('group member roster uses FlatList with stable user IDs', () => {
  assert.ok(source.includes('<FlatList'));
  assert.ok(source.includes('data={visibleMembers}'));
  assert.ok(source.includes('keyExtractor='));
  assert.ok(source.includes('renderItem='));
  assert.ok(!source.includes('visibleMembers.map('));
});

test('group management keeps admin settings, invite controls and empty state in list composition', () => {
  assert.ok(source.includes('ListHeaderComponent='));
  assert.ok(source.includes('ListEmptyComponent='));
  assert.ok(source.includes('ListFooterComponent='));
  assert.ok(source.includes('Remove member'));
  assert.ok(source.includes('Make admin'));
});
