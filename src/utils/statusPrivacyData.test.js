import test from 'node:test';
import assert from 'node:assert/strict';
import { assertStatusPrivacyDataAvailable } from './statusPrivacyData.js';

test('status privacy metadata passes only when all privacy queries succeed', () => {
  assert.equal(assertStatusPrivacyDataAvailable({}), undefined);
  assert.equal(assertStatusPrivacyDataAvailable({ recipientError: null, mutedError: null, excludedError: null }), undefined);
});

test('status privacy metadata fails closed if selected-audience lookup fails', () => {
  assert.throws(() => assertStatusPrivacyDataAvailable({ recipientError: new Error('RLS'), mutedError: null, excludedError: null }), /Could not verify status privacy settings/);
});

test('status privacy metadata fails closed if muted or excluded contact lookup fails', () => {
  assert.throws(() => assertStatusPrivacyDataAvailable({ recipientError: null, mutedError: new Error('offline'), excludedError: null }), /Could not verify status privacy settings/);
  assert.throws(() => assertStatusPrivacyDataAvailable({ recipientError: null, mutedError: null, excludedError: new Error('offline') }), /Could not verify status privacy settings/);
});
