import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./GroupManagementScreen.js', import.meta.url), 'utf8');
const createGroup = readFileSync(new URL('./CreateGroupScreen.js', import.meta.url), 'utf8');

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


test('group member recovery retry action meets the 48-point mobile touch target', () => {
  assert.match(source, /accessibilityLabel="Retry loading group members" style=\{\{ minHeight: 48/);
});


test('group management presents a premium community identity without changing membership permissions', () => {
  assert.ok(source.includes('YOUR COMMUNITY'));
  assert.ok(source.includes('hexToRgba(colors.primary, 0.28)'));
  assert.ok(source.includes('Admin access'));
  assert.ok(source.includes('Member access'));
  assert.ok(source.includes('Changes are verified securely by ZannyChat.'));
  assert.ok(source.includes('createInvite'));
  assert.ok(source.includes('changeAdmin(member)'));
});


test('group creation uses the Crown Aurora welcome surface and preserves the real creation gate', () => {
  assert.ok(createGroup.includes('CREATE YOUR CIRCLE'));
  assert.ok(createGroup.includes('Bring your people together.'));
  assert.ok(createGroup.includes('hexToRgba(colors.primary, 0.28)'));
  assert.ok(createGroup.includes('INVITE YOUR PEOPLE'));
  assert.ok(createGroup.includes('Give your group a name'));
  assert.match(createGroup, /const MIN_OTHER_MEMBERS = 2/);
  assert.match(createGroup, /const canCreate = name\.trim\(\)\.length > 0 && selectedIds\.length >= MIN_OTHER_MEMBERS/);
  assert.match(createGroup, /createGroupConversation\(selectedIds, name\.trim\(\), memberProfiles\)/);
});
