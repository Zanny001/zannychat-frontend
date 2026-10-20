import test from 'node:test';
import assert from 'node:assert/strict';
import { filterGroupMembers } from './filterGroupMembers.js';

const roster = [
  { id: '1', isAdmin: true, profile: { name: 'Ada Lovelace' } },
  { id: '2', isAdmin: false, profile: { name: 'Grace Hopper' } },
  { id: '3', isAdmin: true, profile: { name: 'Alan Turing' } },
  { id: '4', isAdmin: false, profile: null },
];

test('filters group roster by case-insensitive display name', () => {
  assert.deepEqual(filterGroupMembers(roster, 'gRaCe').map((m) => m.id), ['2']);
});
test('filters admins and ordinary members separately', () => {
  assert.deepEqual(filterGroupMembers(roster, '', 'admins').map((m) => m.id), ['1', '3']);
  assert.deepEqual(filterGroupMembers(roster, '', 'members').map((m) => m.id), ['2', '4']);
});
test('combines name and role filters and handles invalid input safely', () => {
  assert.deepEqual(filterGroupMembers(roster, 'a', 'admins').map((m) => m.id), ['1', '3']);
  assert.deepEqual(filterGroupMembers(null), []);
  assert.deepEqual(filterGroupMembers(roster, 'missing'), []);
});
