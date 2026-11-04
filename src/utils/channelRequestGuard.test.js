import test from 'node:test';
import assert from 'node:assert/strict';
import { isCurrentChannelRequest } from './channelRequestGuard.js';

test('accepts the latest channel request when its query is still current', () => {
  assert.equal(isCurrentChannelRequest(4, 4, 'music', 'music'), true);
});

test('rejects an older channel request even when it completes last', () => {
  assert.equal(isCurrentChannelRequest(3, 4, 'music', 'music'), false);
});

test('rejects a response when the search query has changed', () => {
  assert.equal(isCurrentChannelRequest(4, 4, 'music', 'news'), false);
});
