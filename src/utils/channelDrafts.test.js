import test from 'node:test';
import assert from 'node:assert/strict';
import { CHANNEL_POST_DRAFT_LIMIT, CHANNEL_POST_DRAFT_PREFIX, channelPostDraftKey, normalizeChannelPostDraft } from './channelDrafts.js';

test('channel post draft key is namespaced and channel-specific', () => {
  assert.equal(channelPostDraftKey('abc-123', 'user-1'), `${CHANNEL_POST_DRAFT_PREFIX}user-1/abc-123`);
  assert.equal(channelPostDraftKey('  abc-123  ', ' user-1 '), `${CHANNEL_POST_DRAFT_PREFIX}user-1/abc-123`);
  assert.equal(channelPostDraftKey('abc-123', ''), null);
  assert.equal(channelPostDraftKey(''), null);
  assert.equal(channelPostDraftKey(null), null);
});

test('draft normalization preserves text and bounds its length', () => {
  assert.equal(normalizeChannelPostDraft('  draft\ntext  '), '  draft\ntext  ');
  assert.equal(normalizeChannelPostDraft(null), '');
  assert.equal(normalizeChannelPostDraft(12), '');
  assert.equal(normalizeChannelPostDraft('x'.repeat(CHANNEL_POST_DRAFT_LIMIT + 20)).length, CHANNEL_POST_DRAFT_LIMIT);
});
