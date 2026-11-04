import test from 'node:test';
import assert from 'node:assert/strict';
import { getPrivacyLoadFailureState } from './statusPrivacyLoad.js';

test('privacy contact load failure clears stale contacts and exclusions', () => {
  assert.deepEqual(getPrivacyLoadFailureState('exclude', new Error('Network unavailable')), {
    contacts: [], exclusions: [], selectedAudienceIds: null, error: 'Network unavailable',
  });
});

test('selected audience load failure also clears stale selected recipients', () => {
  assert.deepEqual(getPrivacyLoadFailureState('select', new Error('Timeout')), {
    contacts: [], exclusions: [], selectedAudienceIds: [], error: 'Timeout',
  });
});

test('privacy contact load failure provides a safe fallback message', () => {
  assert.match(getPrivacyLoadFailureState('exclude', null).error, /Retry before changing your status audience/);
});
