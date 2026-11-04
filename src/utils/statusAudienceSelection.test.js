import test from 'node:test';
import assert from 'node:assert/strict';
import { updateSelectedAudienceIds } from './statusAudienceSelection.js';

test('bulk select adds filtered contacts without duplicates or losing prior selections', () => {
  assert.deepEqual(updateSelectedAudienceIds(['alice', 'bob'], [' bob ', 'carol', null, ''], true), ['alice', 'bob', 'carol']);
});

test('bulk clear removes only filtered contacts', () => {
  assert.deepEqual(updateSelectedAudienceIds(['alice', 'bob', 'carol'], ['bob', 'nobody'], false), ['alice', 'carol']);
});

test('bulk audience selection tolerates invalid input and normalizes whitespace', () => {
  assert.deepEqual(updateSelectedAudienceIds([' alice ', 7, null], ['bob', ' bob '], true), ['alice', 'bob']);
  assert.deepEqual(updateSelectedAudienceIds(null, null, false), []);
});
