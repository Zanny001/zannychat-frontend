import test from 'node:test';
import assert from 'node:assert/strict';
import { filterEligibleStatusAudienceContacts, removeExcludedStatusAudienceIds } from './statusAudienceEligibility.js';

test('excluded contacts are not eligible selected-audience recipients', () => {
  assert.deepEqual(
    filterEligibleStatusAudienceContacts([{ id: 'a' }, { id: 'b' }, { id: '' }, null], [{ excluded_user_id: 'b' }]),
    [{ id: 'a' }],
  );
});

test('selected audience IDs are cleaned when exclusions change', () => {
  assert.deepEqual(removeExcludedStatusAudienceIds(['a', 'b', 'a', ' ', null], ['b']), ['a']);
});

test('eligibility helpers safely handle missing or malformed collections', () => {
  assert.deepEqual(filterEligibleStatusAudienceContacts(null, null), []);
  assert.deepEqual(removeExcludedStatusAudienceIds(null, null), []);
});
