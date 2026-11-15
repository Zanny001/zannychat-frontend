import test from 'node:test';
import assert from 'node:assert/strict';
import { isSafeStatusMediaPath } from './statusMediaPath.js';

test('accepts only supported media keys owned by the exact status row', () => {
  assert.equal(isSafeStatusMediaPath({ id: 's1', user_id: 'u1', media_kind: 'image', media_path: 'u1/s1/photo.webp' }), true);
  assert.equal(isSafeStatusMediaPath({ id: 's2', user_id: 'u1', media_kind: 'video', media_path: 'u1/s2/video.mp4' }), true);
  assert.equal(isSafeStatusMediaPath({ id: 's3', user_id: 'u1', media_kind: 'video', media_path: 'u1/s3/video.mov' }), true);
  for (const ext of ['gif', 'heic', 'heif']) {
    assert.equal(isSafeStatusMediaPath({ id: `s-${ext}`, user_id: 'u1', media_kind: 'image', media_path: `u1/s-${ext}/photo.${ext}` }), true);
  }
});

test('rejects cross-owner, cross-row, pending, malformed and kind-mismatched media keys', () => {
  const invalid = [
    { id: 's1', user_id: 'u1', media_kind: 'image', media_path: 'u2/s1/photo.jpg' },
    { id: 's1', user_id: 'u1', media_kind: 'image', media_path: 'u1/s2/photo.jpg' },
    { id: 's1', user_id: 'u1', media_kind: 'image', media_path: 'pending' },
    { id: 's1', user_id: 'u1', media_kind: 'image', media_path: 'u1/s1/../photo.jpg' },
    { id: 's1', user_id: 'u1', media_kind: 'video', media_path: 'u1/s1/photo.jpg' },
    { id: 's1', user_id: 'u1', media_kind: 'image', media_path: 'u1/s1/photo.svg' },
    { id: 's1', user_id: 'u1', media_kind: 'video', media_path: 'u1/s1/video.webm' },
    { id: 's1', user_id: 'u1', media_kind: 'video', media_path: 'u1/s1/video.3gp' },
  ];
  for (const row of invalid) assert.equal(isSafeStatusMediaPath(row), false);
});

test('rejects missing and malformed rows', () => {
  assert.equal(isSafeStatusMediaPath(null), false);
  assert.equal(isSafeStatusMediaPath({ id: '', user_id: 'u1', media_kind: 'image', media_path: 'u1//photo.jpg' }), false);
});

test('status service validates keys before signing or deleting storage objects', async () => {
  const { readFile } = await import('node:fs/promises');
  const service = await readFile(new URL('../services/statusUpdates.js', import.meta.url), 'utf8');
  assert.match(service, /if \(!isSafeStatusMediaPath\(row\)\) return \{ \.\.\.base, media_url: null \}/);
  assert.match(service, /if \(!row \|\| !isSafeStatusMediaPath\(row\)\)/);
  assert.match(service, /select\('id,user_id,media_kind,media_path'\)\.eq\('id', statusId\)\.eq\('user_id', auth\.user\.id\)/);
  assert.match(service, /const safeMediaPath = isSafeStatusMediaPath\(row\) \? row\.media_path : null/);
});
