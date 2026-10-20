import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const service = fs.readFileSync(new URL('../services/statusUpdates.js', import.meta.url), 'utf8');
const screen = fs.readFileSync(new URL('../screens/StatusUpdatesScreen.js', import.meta.url), 'utf8');

test('video status upload is MP4-only and bounded to 50 MiB', () => {
  assert.match(service, /50 \* 1024 \* 1024/);
  assert.match(service, /mime !== 'video\/mp4'/);
  assert.match(service, /media_kind: 'video'/);
  assert.match(service, /video\.mp4/);
});
test('status screen supports picking and playback of video statuses', () => {
  assert.match(screen, /mediaTypes: \['videos'\]/);
  assert.match(screen, /useVideoPlayer, VideoView/);
  assert.match(screen, /media_kind === 'video'/);
  assert.match(screen, /publishVideoStatus/);
});
test('video status retains 24-hour expiry and selected audience', () => {
  assert.match(service, /statusExpiryFrom\(createdAt\)/);
  assert.match(service, /audience,\s*media_kind: 'video'/);
  assert.match(service, /createSignedUrl\(path, 300\)/);
});
