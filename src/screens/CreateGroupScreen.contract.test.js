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
