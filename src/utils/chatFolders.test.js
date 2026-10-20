import test from 'node:test';
import assert from 'node:assert/strict';
import { filterByChatFolder } from './chatFolders.js';

const chats = [
  { id: 'a', unreadCount: 2 },
  { id: 'b', isGroup: true, isFavorite: true, unreadCount: 0 },
  { id: 'c', isGroup: true, isArchived: true, unreadCount: 3 },
  { id: 'd', isMuted: true, unreadCount: 1 },
];

test('custom folders match any selected inclusion rule and exclude archived by default', () => {
  assert.deepEqual(filterByChatFolder(chats, { rules: ['unread', 'favorites'] }).map((c) => c.id), ['a', 'b', 'd']);
});

test('folder exclusions can remove muted and already-read chats', () => {
  assert.deepEqual(filterByChatFolder(chats, { rules: ['unread', 'groups'], excluded: ['muted', 'read'] }).map((c) => c.id), ['a']);
});

test('invalid collection or folder returns an empty list', () => {
  assert.deepEqual(filterByChatFolder(null, { rules: [] }), []);
  assert.deepEqual(filterByChatFolder(chats, null), []);
});
