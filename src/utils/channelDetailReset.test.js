import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../screens/ChannelsScreen.js', import.meta.url), 'utf8');

test('channel deselection clears channel-scoped and privileged state', () => {
  const helper = source.slice(source.indexOf('const clearSelectedChannel'), source.indexOf('const refresh ='));
  for (const reset of [
    'setSelected(null)', 'setPosts([])', 'setPostsCursor(null)', 'setHasMorePosts(false)',
    'setModeratorMembers([])', 'setChannelInvites([])', 'setChannelReports([])', 'setShowReports(false)',
    'setExpandedComments({})', 'setCommentsByPost({})', 'setCommentPaginationByPost({})',
    'setLoadingOlderCommentsByPost({})', 'setCommentDrafts({})', 'setEditingChannel(false)',
    'setEditingPostId(null)', "setEditPostDraft('')", "setPostText('')",
  ]) assert.ok(helper.includes(reset), `missing reset: ${reset}`);
  assert.match(source, /onBack=\{\(\) => selected \? clearSelectedChannel\(\) : navigation\.goBack\(\)\}/);
  assert.match(source, /onPress=\{clearSelectedChannel\}[^\n]*Directory/);
});

test('refresh disappearance and channel deletion reuse the complete reset helper', () => {
  const refresh = source.slice(source.indexOf('const refresh ='), source.indexOf('const openChannel ='));
  const remove = source.slice(source.indexOf('const remove ='), source.indexOf('const isOwner ='));
  assert.match(refresh, /clearSelectedChannel\(\)/);
  assert.match(remove, /if \(selected\?\.id === channel\.id\) clearSelectedChannel\(\)/);
});
