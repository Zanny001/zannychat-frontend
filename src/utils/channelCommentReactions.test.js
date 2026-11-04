import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync(new URL('../services/api.js', import.meta.url), 'utf8');
const screen = fs.readFileSync(new URL('../screens/ChannelsScreen.js', import.meta.url), 'utf8');

test('comment reaction API encodes identifiers and sends the selected emoji', () => {
  assert.match(api, /setChannelPostCommentReaction\(channelId, postId, commentId, emoji\)/);
  assert.match(api, /comments\/\$\{encodeURIComponent\(commentId\)\}\/reaction/);
  assert.match(api, /method: 'PUT', body: JSON\.stringify\(\{ emoji \}\)/);
});

test('channel comments render counts and allow toggling the supported quick reactions', () => {
  assert.match(screen, /const reactToComment = async \(post, comment, emoji\) =>/);
  assert.match(screen, /comment\.reactionCounts\?\.\[emoji\]/);
  assert.match(screen, /comment\.myReaction === emoji \? null : emoji/);
  assert.match(screen, /accessibilityLabel=\{`\$\{emoji\} comment reaction/);
});
