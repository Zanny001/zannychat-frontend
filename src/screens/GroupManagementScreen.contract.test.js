import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./GroupManagementScreen.js', import.meta.url), 'utf8');

test('group management imports and renders a virtualized FlatList', () => {
  assert.match(source, /import \{[^}]*\bFlatList\b[^}]*\} from 'react-native'/);
  assert.ok(source.includes('<FlatList'));
  assert.ok(source.includes('data={visibleMembers}'));
  assert.ok(source.includes('keyExtractor={(member) => String(member.id)}'));
  assert.ok(source.includes('renderItem={({ item: member }) =>'));
  assert.ok(!source.includes('visibleMembers.map('));
});

test('group member search and role filters remain in the list header', () => {
  assert.ok(source.includes('ListHeaderComponent='));
  assert.ok(source.includes('Search group members by name'));
  assert.ok(source.includes("['admins', 'Admins']"));
  assert.ok(source.includes("['members', 'Members']"));
});

test('group admin, invite and leave actions remain present in virtualized rows and header', () => {
  assert.ok(source.includes('changeAdmin(member)'));
  assert.ok(source.includes('removeMember(member)'));
  assert.ok(source.includes('createInvite'));
  assert.ok(source.includes('revokeInvite(invite)'));
  assert.ok(source.includes('Member changes require a working backend session'));
  assert.ok(!source.includes('{footer.'));
});
