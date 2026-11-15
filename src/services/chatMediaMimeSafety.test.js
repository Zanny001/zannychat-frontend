import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync(new URL('./api.js', import.meta.url), 'utf8');

test('chat media uploads use the exact 25,000,000-byte Storage limit', () => {
  assert.match(api, /MAX_CHAT_MEDIA_UPLOAD_BYTES = 25_000_000/);
  assert.match(api, /assertChatMediaSize\(arrayBuffer\?\.byteLength\)/);
  assert.match(api, /FILE_TOO_LARGE/);
});

test('chat media accepts supported images, video, audio, and downloadable documents', () => {
  for (const mime of [
    'image/jpeg', 'image/png', 'image/webp', 'image/heic',
    'video/mp4', 'video/quicktime', 'audio/m4a', 'audio/mp4',
    'application/pdf', 'application/octet-stream', 'application/zip',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain', 'text/csv',
  ]) assert.ok(api.includes(`'${mime}'`), `missing MIME type ${mime}`);
});

test('active web and executable attachment extensions are rejected even with a generic MIME type', () => {
  for (const ext of ['html', 'htm', 'svg', 'js', 'exe', 'dll', 'msi', 'bat', 'cmd', 'sh', 'apk', 'php']) {
    assert.ok(api.includes(`'${ext}'`), `missing blocked extension ${ext}`);
  }
  assert.match(api, /assertSafeChatAttachmentName\(fileName\)/);
  assert.match(api, /normalizeChatMediaMimeType\(mimeType, 'application\/octet-stream'\)/);
});

test('chat image and voice uploads use MIME types accepted by the private bucket', () => {
  assert.match(api, /normalizeChatMediaMimeType\(mimeType, 'image\/jpeg'\)/);
  assert.match(api, /contentType: safeMimeType/);
  assert.match(api, /contentType: 'audio\/m4a'/);
});
