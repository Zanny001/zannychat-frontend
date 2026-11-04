import test from 'node:test';
import assert from 'node:assert/strict';
import { getMediaSaveRequest, isCompatibleMediaContentType } from './mediaSavePolicy.js';

test('media save accepts only remote HTTP(S) images and videos', () => {
  assert.equal(getMediaSaveRequest('https://cdn.example.com/a.jpg', 'image').kind, 'image');
  assert.equal(getMediaSaveRequest('https://cdn.example.com/a.mp4?token=abc', 'video').kind, 'video');
  assert.equal(getMediaSaveRequest('file:///private/a.jpg', 'image'), null);
  assert.equal(getMediaSaveRequest('javascript:alert(1)', 'image'), null);
  assert.equal(getMediaSaveRequest('https://cdn.example.com/a.pdf', 'file'), null);
});

test('media save rejects invalid, empty, and excessively long URLs', () => {
  assert.equal(getMediaSaveRequest('', 'image'), null);
  assert.equal(getMediaSaveRequest('not a URL', 'image'), null);
  assert.equal(getMediaSaveRequest(`https://cdn.example.com/${'a'.repeat(8200)}`, 'image'), null);
});

test('media save creates a sanitized filename prefix and expected extension', () => {
  const image = getMediaSaveRequest('https://cdn.example.com/a.jpg', 'image', '../unsafe prefix');
  const video = getMediaSaveRequest('https://cdn.example.com/a.mp4', 'video', 'zannychat-status');
  assert.match(image.filename, /^unsafeprefix-.*\.jpg$/);
  assert.match(video.filename, /^zannychat-status-.*\.mp4$/);
  assert.equal(getMediaSaveRequest('https://cdn.example.com/photo.png?token=abc', 'image').extension, 'png');
  assert.equal(getMediaSaveRequest('https://cdn.example.com/clip.mov', 'video').extension, 'mov');
});

test('media save validates a response content type when the server supplies one', () => {
  assert.equal(isCompatibleMediaContentType('image/png; charset=binary', 'image'), true);
  assert.equal(isCompatibleMediaContentType('video/mp4', 'video'), true);
  assert.equal(isCompatibleMediaContentType('text/html', 'image'), false);
  assert.equal(isCompatibleMediaContentType('application/json', 'video'), false);
  assert.equal(isCompatibleMediaContentType('', 'image'), true);
});
