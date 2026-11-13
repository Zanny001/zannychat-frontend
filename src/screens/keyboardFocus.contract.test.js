import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const keyboardScrollableForms = [
  'JoinGroupScreen.js',
  'NotificationsScreen.js',
  'PrivacySecurityScreen.js',
  'SettingsScreen.js',
  'GroupManagementScreen.js',
  'SharedMediaScreen.js',
  'ContactDiscoveryScreen.js',
  'ChatFoldersScreen.js',
  'ChannelsScreen.js',
  'EventsScreen.js',
  'PollsScreen.js',
  'ScheduledMessagesScreen.js',
  'StatusUpdatesScreen.js',
  'LiveStreamScreen.web.js',
];

test('all scrollable form screens preserve handled taps while the keyboard is open', () => {
  for (const file of keyboardScrollableForms) {
    const source = fs.readFileSync(path.join(root, 'src/screens', file), 'utf8');
    assert.match(source, /<ScrollView\b[^>]*keyboardShouldPersistTaps=["']handled["'][^>]*>/, file + ' must preserve taps while an input has focus');
  }
});

test('searchable lists preserve item taps while the keyboard is open', () => {
  for (const file of ['ChatListScreen.js', 'NewChatScreen.js', 'ChatScreen.js', 'LiveStreamScreen.js']) {
    const source = fs.readFileSync(path.join(root, 'src/screens', file), 'utf8');
    const lists = [...source.matchAll(/<FlatList\b[^>]*>/g)];
    assert.ok(lists.length > 0, file + ' should contain its expected list');
    for (const list of lists) assert.match(list[0], /keyboardShouldPersistTaps=["']handled["']/, file + ' list must preserve handled taps');
  }
});

test('shared GlassInput forwards native focus and keyboard props without remounting its TextInput', () => {
  const source = fs.readFileSync(path.join(root, 'src/components/GlassInput.js'), 'utf8');
  assert.match(source, /<TextInput[\s\S]*?\{\.\.\.textInputProps\}/);
  assert.doesNotMatch(source, /key=\{(?:value|textInputProps\.value|textInputProps\.placeholder)/);
});

test('message composer keeps a stable TextInput while draft and emoji state change', () => {
  const source = fs.readFileSync(path.join(root, 'src/components/InputBar.js'), 'utf8');
  assert.match(source, /<TextInput[\s\S]*?value=\{text\}/);
  assert.doesNotMatch(source, /<TextInput[^>]*key=/);
});
