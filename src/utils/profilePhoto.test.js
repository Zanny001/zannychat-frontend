import test from 'node:test';
import assert from 'node:assert/strict';
import { getSafeProfilePhotoUrl } from './profilePhoto.js';

test('profile photo URL accepts absolute HTTPS and HTTP URLs', () => {
  assert.equal(getSafeProfilePhotoUrl('https://cdn.example.com/photo.jpg'), 'https://cdn.example.com/photo.jpg');
  assert.equal(getSafeProfilePhotoUrl(' http://cdn.example.com/photo.png '), 'http://cdn.example.com/photo.png');
});

test('profile photo URL rejects unsupported schemes and malformed values', () => {
  assert.equal(getSafeProfilePhotoUrl('javascript:alert(1)'), null);
  assert.equal(getSafeProfilePhotoUrl('file:///private/photo.jpg'), null);
  assert.equal(getSafeProfilePhotoUrl('//cdn.example.com/photo.jpg'), null);
  assert.equal(getSafeProfilePhotoUrl('https://'), null);
  assert.equal(getSafeProfilePhotoUrl(null), null);
  assert.equal(getSafeProfilePhotoUrl({ uri: 'https://cdn.example.com/photo.jpg' }), null);
});
