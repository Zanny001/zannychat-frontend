import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const wideScreens = [
  'CreateGroupScreen.js',
  'PollsScreen.js',
  'EventsScreen.js',
  'GroupManagementScreen.js',
  'ScheduledMessagesScreen.js',
];

test('group, poll, event and scheduled-message surfaces share the centered content measure', () => {
  for (const file of wideScreens) {
    const source = readFileSync(new URL('./' + file, import.meta.url), 'utf8');
    assert.match(source, /layout\.contentMaxWidth/, file + ' must use the shared content measure');
    assert.match(source, /maxWidth: layout\.contentMaxWidth/, file + ' must cap wide-screen content');
    assert.match(source, /alignSelf: 'center'/, file + ' must center the content');
  }
});

test('Join Group token form uses the narrower shared form measure', () => {
  const source = readFileSync(new URL('./JoinGroupScreen.js', import.meta.url), 'utf8');
  assert.match(source, /layout\.formMaxWidth/);
  assert.match(source, /maxWidth: layout\.formMaxWidth/);
  assert.match(source, /alignSelf: 'center'/);
});
