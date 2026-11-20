import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const files = {
  chats: readFileSync(new URL('./ChatListScreen.js', import.meta.url), 'utf8'),
  chat: readFileSync(new URL('./ChatScreen.js', import.meta.url), 'utf8'),
  newChat: readFileSync(new URL('./NewChatScreen.js', import.meta.url), 'utf8'),
};

test('primary chat surfaces use the shared centered content measure on wide screens', () => {
  for (const [name, source] of Object.entries(files)) {
    assert.match(source, /layout\.contentMaxWidth/, name + ' must use the shared layout token');
    assert.match(source, /maxWidth: layout\.contentMaxWidth/, name + ' must cap wide-screen content');
    assert.match(source, /alignSelf: 'center'/, name + ' must center the content column');
  }
});

test('chat message composer and timeline share one bounded responsive column', () => {
  assert.match(files.chat, /<KeyboardAvoidingView\s+style=\{\{ flex: 1, width: '100%', maxWidth: layout\.contentMaxWidth, alignSelf: 'center' \}\}/);
});

test('inbox and new-chat content remain fluid on narrow devices', () => {
  assert.match(files.chats, /width: '100%', maxWidth: layout\.contentMaxWidth/);
  assert.match(files.newChat, /width: '100%', maxWidth: layout\.contentMaxWidth/);
});
