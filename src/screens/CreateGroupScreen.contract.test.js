import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('./CreateGroupScreen.js', import.meta.url), 'utf8');

test('group creation provides local contact search and clear no-match recovery', () => {
  assert.match(screen, /Search contacts by name/);
  assert.match(screen, /Find someone by name/);
  assert.match(screen, /const visibleContacts = useMemo/);
  assert.match(screen, /contact\.name \|\| ''\)\.toLowerCase\(\)\.includes\(query\)/);
  assert.match(screen, /data=\{visibleContacts\}/);
  assert.match(screen, /No contacts match that name/);
  assert.match(screen, /Clear contact search/);
});

test('group contact search does not change selection or the minimum group membership rule', () => {
  assert.match(screen, /const MIN_OTHER_MEMBERS = 2/);
  assert.match(screen, /selectedIds\.length >= MIN_OTHER_MEMBERS/);
  assert.match(screen, /selectedIds\.includes\(contactId\)/);
  assert.match(screen, /createGroupConversation\(selectedIds, name\.trim\(\), memberProfiles\)/);
  assert.match(screen, /accessibilityRole="checkbox"/);
});

test('group creation keeps selected members visible and removable while the contact search changes', () => {
  assert.match(screen, /const selectedContacts = selectedIds\.map/);
  assert.match(screen, /SELECTED PEOPLE · TAP TO REMOVE/);
  assert.match(screen, /selectedContacts\.map\(\(contact\) =>/);
  assert.match(screen, /Remove .* from selected group members/);
  assert.match(screen, /onPress=\{\(\) => toggle\(contact\.id\)\}/);
  assert.match(screen, /minHeight: 44/);
});
