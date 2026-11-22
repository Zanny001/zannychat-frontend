import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('./CreateGroupScreen.js', import.meta.url), 'utf8');

test('group creation provides a live review rail for selected members', () => {
  assert.match(screen, /const selectedContacts = contacts\.filter\(\(contact\) => selectedIds\.includes\(contact\.id\)\)/);
  assert.match(screen, /YOUR SELECTED PEOPLE/);
  assert.match(screen, /selectedContacts\.map\(\(contact\) =>/);
  assert.match(screen, /Avatar name=\{contact\.name\}/);
});

test('selected member chips can remove a person without scrolling the contact directory', () => {
  assert.match(screen, /onPress=\{\(\) => toggle\(contact\.id\)\}/);
  assert.match(screen, /Remove \$\{contact\.name\} from group/);
  assert.match(screen, /accessibilityRole="button"/);
  assert.match(screen, /minHeight: 44/);
});

test('group creation retains minimum membership, selected contact data and existing API call', () => {
  assert.match(screen, /const MIN_OTHER_MEMBERS = 2/);
  assert.match(screen, /selectedIds\.length >= MIN_OTHER_MEMBERS/);
  assert.match(screen, /createGroupConversation\(selectedIds, name\.trim\(\), memberProfiles\)/);
  assert.match(screen, /navigation\.replace\('Chat', \{ conversation \}\)/);
  assert.match(screen, /accessibilityRole="checkbox"/);
});
