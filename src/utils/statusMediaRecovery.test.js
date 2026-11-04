import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeStatusMediaUrl } from './statusMediaRecovery.js';

const screen = fs.readFileSync(new URL('../screens/StatusUpdatesScreen.js', import.meta.url), 'utf8');

test('status media recovery accepts absolute HTTP and HTTPS URLs only', () => {
  assert.equal(normalizeStatusMediaUrl('https://media.example.com/status.jpg?token=abc'), 'https://media.example.com/status.jpg?token=abc');
  assert.equal(normalizeStatusMediaUrl('http://localhost:8080/video.mp4'), 'http://localhost:8080/video.mp4');
  assert.equal(normalizeStatusMediaUrl('file:///private/status.jpg'), null);
  assert.equal(normalizeStatusMediaUrl('javascript:alert(1)'), null);
  assert.equal(normalizeStatusMediaUrl('/relative/status.jpg'), null);
  assert.equal(normalizeStatusMediaUrl(''), null);
  assert.equal(normalizeStatusMediaUrl(null), null);
});

test('status viewer exposes accessible recovery for failed image and video media', () => {
  assert.match(screen, /onError=\{handleStatusVideoError\}/);
  assert.match(screen, /Retry media/);
  assert.match(screen, /player\.addListener\('statusChange'/);
  assert.match(screen, /event\?\.status === 'error'/);
  assert.match(screen, /media_kind === 'video' && viewing\?\.media_url && !mediaLoadError/);
  assert.match(screen, /normalizeStatusMediaUrl\(await refreshStatusMediaUrl\(requestedStatusId\)\)/);
});


test('status media retry is guarded against rapid duplicate requests', () => {
  assert.match(screen, /mediaRetryLockRef = useRef\(false\)/);
  assert.match(screen, /if \(!requestedStatusId \|\| mediaRetryLockRef\.current\) return/);
  assert.match(screen, /mediaRetryLockRef\.current = true/);
  assert.match(screen, /mediaRetryLockRef\.current = false/);
});

test('status media retry applies refreshed URLs only to the status that requested them', () => {
  assert.match(screen, /current\?\.id === requestedStatusId \? \{ \.\.\.current, media_url: refreshed \} : current/);
  assert.match(screen, /if \(viewing\?\.id === requestedStatusId\) Alert\.alert/);
});


test('status auto-progression pauses while media is missing, retrying, or failed', () => {
  assert.match(screen, /const mediaNeedsRecovery = \['image', 'video'\]\.includes\(viewing\?\.media_kind\) && \(!viewing\?\.media_url \|\| mediaLoadError \|\| retryingMedia\)/);
  assert.match(screen, /statusPaused \|\| mediaNeedsRecovery/);
  assert.match(screen, /mediaLoadError, retryingMedia/);
});
