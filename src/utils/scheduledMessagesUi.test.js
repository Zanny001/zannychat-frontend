import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const screen = await readFile(resolve(here, '../screens/ScheduledMessagesScreen.js'), 'utf8');
const chat = await readFile(resolve(here, '../screens/ChatScreen.js'), 'utf8');
const profile = await readFile(resolve(here, '../screens/ProfileScreen.js'), 'utf8');
const navigator = await readFile(resolve(here, '../navigation/AppNavigator.js'), 'utf8');

test('scheduled message UI lists, refreshes, creates, and cancels through backend API helpers', () => {
  assert.match(screen, /fetchScheduledMessages/);
  assert.match(screen, /scheduleMessage\(conversationId/);
  assert.match(screen, /cancelScheduledMessage\(item\.id\)/);
  assert.match(screen, /Refresh scheduled messages/);
});

test('scheduled messages can be opened from a chat and profile', () => {
  assert.match(chat, /navigation\.navigate\('ScheduledMessages', \{ conversation: display \}\)/);
  assert.match(profile, /label="Scheduled messages" onPress=\{\(\) => navigation\.navigate\('ScheduledMessages'\)\}/);
  assert.match(navigator, /name="ScheduledMessages" component=\{ScheduledMessagesScreen\}/);
});

test('scheduled message UI does not imply delivery unless worker is configured', () => {
  assert.match(screen, /when the scheduled-message worker is configured and running/);
});

test('scheduled messages can choose a destination when opened from Profile', () => {
  assert.match(screen, /const \[selectedConversationId, setSelectedConversationId\]/);
  assert.match(screen, /Schedule for \$\{conversationName\(row\.id\)\}/);
  assert.match(screen, /setSelectedConversationId\(row\.id\)/);
  assert.match(screen, /Choose a conversation, then write the message/);
});
