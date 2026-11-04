import test from 'node:test';
import assert from 'node:assert/strict';
import { filterZannyMembers } from './filterZannyMembers.js';

test('member directory searches names and status case-insensitively', () => {
  const members = [{ id: 'b', name: 'Bola', status: 'Available' }, { id: 'a', name: 'Ada', status: 'Busy' }];
  assert.deepEqual(filterZannyMembers(members, 'ADA').map((row) => row.id), ['a']);
  assert.deepEqual(filterZannyMembers(members, 'available').map((row) => row.id), ['b']);
});

test('online filter only includes explicitly online members', () => {
  const members = [{ id: 'a', name: 'Ada', online: true }, { id: 'b', name: 'Bola', online: false }, { id: 'c', name: 'Chris' }];
  assert.deepEqual(filterZannyMembers(members, '', true).map((row) => row.id), ['a']);
});

test('directory is sorted by name without mutating input and ignores malformed rows', () => {
  const members = [{ id: 'b', name: 'Zara' }, null, { id: 'a', name: 'Ada' }, { name: 'Missing ID' }];
  const original = members.slice();
  assert.deepEqual(filterZannyMembers(members).map((row) => row.name), ['Ada', 'Zara']);
  assert.deepEqual(members, original);
});

test('empty or invalid input returns an empty list', () => {
  assert.deepEqual(filterZannyMembers(null), []);
  assert.deepEqual(filterZannyMembers([{ id: 'a', name: 'Ada' }], 'no match'), []);
});
