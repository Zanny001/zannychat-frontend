import test from 'node:test';
import assert from 'node:assert/strict';
import { filterMemberDirectory, memberFavoritesStorageKey, normalizeMemberFavorites, toggleMemberFavorite } from './memberFavorites.js';

test('member favorites are isolated by user and have a stable key', () => {
  assert.notEqual(memberFavoritesStorageKey('user-a'), memberFavoritesStorageKey('user-b'));
  assert.equal(memberFavoritesStorageKey(' user-a '), memberFavoritesStorageKey('user-a'));
});

test('favorite lists reject malformed entries, deduplicate and cap length', () => {
  assert.deepEqual(normalizeMemberFavorites(['a', 'a', '', null, ' b ']), ['a', 'b']);
  assert.equal(normalizeMemberFavorites(Array.from({ length: 600 }, (_, i) => String(i))).length, 500);
});

test('toggle favorite adds and removes without mutating source', () => {
  const initial = ['a'];
  assert.deepEqual(toggleMemberFavorite(initial, 'b'), ['a', 'b']);
  assert.deepEqual(toggleMemberFavorite(initial, 'a'), []);
  assert.deepEqual(initial, ['a']);
});

test('directory supports all, online and favorites filters plus search', () => {
  const members = [{ id: 'a', name: 'Ada', online: true }, { id: 'b', name: 'Bola', online: false }, { id: 'c', name: 'Chris', online: true }];
  assert.deepEqual(filterMemberDirectory(members, '', 'online').map((m) => m.id), ['a', 'c']);
  assert.deepEqual(filterMemberDirectory(members, '', 'favorites', ['b']).map((m) => m.id), ['b']);
  assert.deepEqual(filterMemberDirectory(members, 'ADA', 'all').map((m) => m.id), ['a']);
});
