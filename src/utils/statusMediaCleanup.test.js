import test from 'node:test';
import assert from 'node:assert/strict';
import { getSafeExpiredStatusMediaPaths } from './statusMediaCleanup.js';

test('expired status cleanup only returns media paths owned by the expected status row', () => {
  const rows = [
    { id: 'a', user_id: 'me', media_path: 'me/a/photo.jpg' },
    { id: 'b', user_id: 'me', media_path: 'me/b/video.mp4' },
    { id: 'c', user_id: 'other', media_path: 'other/c/photo.jpg' },
  ];
  assert.deepEqual(getSafeExpiredStatusMediaPaths(rows, 'me'), ['me/a/photo.jpg', 'me/b/video.mp4']);
});

test('malformed, pending, unsupported, duplicate, and cross-row paths are never deletion targets', () => {
  const rows = [
    { id: 'a', user_id: 'me', media_path: 'pending' },
    { id: 'b', user_id: 'me', media_path: 'me/a/photo.jpg' },
    { id: 'c', user_id: 'me', media_path: 'me/c/photo.gif' },
    { id: 'd', user_id: 'me', media_path: 'someone-else/d/photo.jpg' },
    { id: 'e', user_id: 'me', media_path: 'me/e/../../other/photo.jpg' },
    { id: 'f', user_id: 'me', media_path: 'me/f/video.mp4' },
    { id: 'f', user_id: 'me', media_path: 'me/f/video.mp4' },
  ];
  assert.deepEqual(getSafeExpiredStatusMediaPaths(rows, 'me'), ['me/f/video.mp4']);
});

test('missing owner or malformed row collections fail closed', () => {
  assert.deepEqual(getSafeExpiredStatusMediaPaths(null, 'me'), []);
  assert.deepEqual(getSafeExpiredStatusMediaPaths([{ id: 'a', user_id: 'me', media_path: 'me/a/photo.jpg' }], ''), []);
});


test('cleanup helper requires owner metadata so the service must select user_id', async () => {
  const { readFile } = await import('node:fs/promises');
  const service = await readFile(new URL('../services/statusUpdates.js', import.meta.url), 'utf8');
  assert.match(service, /\.select\('id,user_id,media_path'\)\.eq\('user_id', userId\)\.lte\('expires_at', now\)/);
  assert.doesNotMatch(service, /\.select\('id,media_path'\)\.eq\('user_id', userId\)\.lte\('expires_at', now\)/);
});
