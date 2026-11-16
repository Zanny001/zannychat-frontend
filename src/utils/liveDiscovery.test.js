import test from 'node:test';
import assert from 'node:assert/strict';
import { filterLiveStreams } from './liveDiscovery.js';

const streams = [
  { id: '1', title: 'Afrobeats Night', description: 'Live music', creator_id: 'a', creator_name: 'Zanny', visibility: 'public' },
  { id: '2', title: 'Design Studio', description: 'Product design Q&A', creator_id: 'b', creator: { name: 'Ada' }, visibility: 'followers' },
  { id: '3', title: 'Sunday Chat', creator_id: 'a', creatorName: 'Nneka', visibility: 'public' },
];

test('LIVE discovery searches titles, descriptions and creator names case-insensitively', () => {
  assert.deepEqual(filterLiveStreams(streams, { query: 'AFRO' }).map((item) => item.id), ['1']);
  assert.deepEqual(filterLiveStreams(streams, { query: 'product design' }).map((item) => item.id), ['2']);
  assert.deepEqual(filterLiveStreams(streams, { query: 'nneka' }).map((item) => item.id), ['3']);
});

test('LIVE discovery combines search with existing following and public filters', () => {
  assert.deepEqual(filterLiveStreams(streams, { filter: 'following', followingIds: ['a'], query: 'chat' }).map((item) => item.id), ['3']);
  assert.deepEqual(filterLiveStreams(streams, { filter: 'public', query: 'design' }), []);
});

test('LIVE discovery handles empty queries and malformed collections safely', () => {
  assert.deepEqual(filterLiveStreams(streams, { query: '  ' }).map((item) => item.id), ['1', '2', '3']);
  assert.deepEqual(filterLiveStreams(null), []);
});
