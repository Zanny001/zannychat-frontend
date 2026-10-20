import test from 'node:test';
import assert from 'node:assert/strict';
import { filterConversations } from './filterConversations.js';

const chats = [
  { id: '1', participant: { name: 'Ada Lovelace' }, lastMessage: 'Meet at noon', unreadCount: 2 },
  { id: '2', participant: { name: 'Team Zanny' }, lastMessage: 'Release checklist', isGroup: true, isFavorite: true },
  { id: '3', participant: { name: 'Grace Hopper' }, lastMessage: 'Archived note', isArchived: true, unreadCount: 1 },
  { id: '4', lastMessage: 'A chat with missing fields', unreadCount: 0 },
];

test('search matches participant, group name, and last-message preview safely', () => {
  assert.deepEqual(filterConversations(chats, 'all', 'ADA').map((c) => c.id), ['1']);
  assert.deepEqual(filterConversations(chats, 'all', 'release').map((c) => c.id), ['2']);
  assert.deepEqual(filterConversations(chats, 'all', 'missing').map((c) => c.id), ['4']);
});

test('filters unread, favorites, groups, and archived without leaking archived chats', () => {
  assert.deepEqual(filterConversations(chats, 'unread').map((c) => c.id), ['1']);
  assert.deepEqual(filterConversations(chats, 'favorites').map((c) => c.id), ['2']);
  assert.deepEqual(filterConversations(chats, 'groups').map((c) => c.id), ['2']);
  assert.deepEqual(filterConversations(chats, 'archived').map((c) => c.id), ['3']);
});

test('handles absent conversation collections and blank queries', () => {
  assert.deepEqual(filterConversations(null), []);
  assert.deepEqual(filterConversations(chats, 'all', '   ').map((c) => c.id), ['1', '2', '4']);
});
