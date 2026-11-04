import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(process.cwd());
const api = fs.readFileSync(path.join(root, 'src/services/api.js'), 'utf8');
const screen = fs.readFileSync(path.join(root, 'src/screens/ChannelsScreen.js'), 'utf8');
test('channel comment reporting has an API call and user-facing report reasons', () => {
  assert.match(api, /export async function reportChannelPostComment/);
  assert.match(api, /comments\/\$\{encodeURIComponent\(commentId\)\}\/reports/);
  assert.match(screen, /Report channel comment/);
  assert.match(screen, /submitCommentReport\(post, comment, 'harassment'\)/);
  assert.match(screen, /accessibilityLabel="Report channel comment"/);
});
test('channel moderator report list distinguishes comment reports', () => {
  assert.match(screen, /report\.reportType === 'comment'/);
  assert.match(screen, /fetchChannelPostReports\(selected\.id\)/);
});
