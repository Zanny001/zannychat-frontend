import test from 'node:test';
import assert from 'node:assert/strict';
import { filterStatusContacts } from './filterStatusContacts.js';

test('returns all contacts for an empty or whitespace query', () => {
  const rows = [{ id: 'a', name: 'Ada' }, { id: 'b', name: 'Bola' }];
  assert.deepEqual(filterStatusContacts(rows, ''), rows);
  assert.deepEqual(filterStatusContacts(rows, '   '), rows);
});

test('matches contact names case-insensitively and partially', () => {
  assert.deepEqual(filterStatusContacts([{ id: 'a', name: 'Ada Lovelace' }, { id: 'b', name: 'Bola' }], 'ADA'), [{ id: 'a', name: 'Ada Lovelace' }]);
  assert.deepEqual(filterStatusContacts([{ id: 'a', name: 'Ada Lovelace' }], 'love'), [{ id: 'a', name: 'Ada Lovelace' }]);
});

test('matches account identifiers and handles missing inputs safely', () => {
  assert.deepEqual(filterStatusContacts([{ id: 'user-123', name: 'Contact' }], '123'), [{ id: 'user-123', name: 'Contact' }]);
  assert.deepEqual(filterStatusContacts(null, 'x'), []);
  assert.deepEqual(filterStatusContacts([{ id: 'a' }], 'missing'), []);
});
