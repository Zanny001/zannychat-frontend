import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_MEDIA_PREFERENCES, normalizeMediaPreferences, resolvePhotoUploadQuality } from './mediaQuality.js';

test('normalizes absent, invalid, and partial media preferences safely', () => {
  assert.deepEqual(normalizeMediaPreferences(null), DEFAULT_MEDIA_PREFERENCES);
  assert.deepEqual(normalizeMediaPreferences({ photoQuality: 'unknown', dataSaver: 'yes' }), DEFAULT_MEDIA_PREFERENCES);
  assert.deepEqual(normalizeMediaPreferences({ photoQuality: 'high' }), { photoQuality: 'high', dataSaver: false });
});

test('resolves the selected upload quality', () => {
  assert.equal(resolvePhotoUploadQuality({ photoQuality: 'compact' }), 0.45);
  assert.equal(resolvePhotoUploadQuality({ photoQuality: 'balanced' }), 0.7);
  assert.equal(resolvePhotoUploadQuality({ photoQuality: 'high' }), 0.9);
});

test('data saver overrides high-detail preference without destroying it', () => {
  const preferences = { photoQuality: 'high', dataSaver: true };
  assert.equal(resolvePhotoUploadQuality(preferences), 0.45);
  assert.equal(normalizeMediaPreferences(preferences).photoQuality, 'high');
});
