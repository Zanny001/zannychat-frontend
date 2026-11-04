import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync(new URL('../services/api.js', import.meta.url), 'utf8');
const screen = fs.readFileSync(new URL('../screens/ChannelsScreen.js', import.meta.url), 'utf8');

test('channel comment edit API uses PATCH and encodes path identifiers', () => {
  assert.match(api, /updateChannelPostComment\(channelId, postId, commentId, body\)/);
  assert.match(api, /method: 'PATCH', body: JSON\.stringify\(\{ body \}\)/);
  assert.match(api, /comments\/\$\{encodeURIComponent\(commentId\)\}/);
});

test('channel comments expose an author-only inline edit flow with save and cancel', () => {
  assert.match(screen, /const saveEditedComment = async \(post, comment\) =>/);
  assert.match(screen, /comment\.mine && editingCommentId !== comment\.id/);
  assert.match(screen, /Save edit/);
  assert.match(screen, /Cancel/);
  assert.match(screen, /Comment cannot be empty/);
});
