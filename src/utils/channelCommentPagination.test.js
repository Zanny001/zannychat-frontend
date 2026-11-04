import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync(new URL('../services/api.js', import.meta.url), 'utf8');
const screen = fs.readFileSync(new URL('../screens/ChannelsScreen.js', import.meta.url), 'utf8');

test('channel comment API preserves pagination metadata and sends stable cursors', () => {
  assert.match(api, /fetchChannelPostComments\(channelId, postId, cursor = null\)/);
  assert.match(api, /params\.set\('beforeCreatedAt', cursor\.created_at\)/);
  assert.match(api, /params\.set\('beforeId', cursor\.id\)/);
  assert.match(api, /nextCursor: result\?\.nextCursor \|\| null, hasMore: Boolean\(result\?\.hasMore\)/);
});

test('channel comments expose a load-older action and merge without duplicate IDs', () => {
  assert.match(screen, /const loadOlderComments = async \(post\) =>/);
  assert.match(screen, /mergeChannelCommentPages\(old\[post\.id\], page\.comments\)/);
  assert.match(screen, /Load older comments/);
  assert.match(screen, /loadingOlderCommentsByPost/);
});
