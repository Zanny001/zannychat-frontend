import test from 'node:test';
import assert from 'node:assert/strict';
import { getActiveCreatorStreamId, hasLiveConnectionCredentials } from './liveCreatorRecovery.js';

test('creator recovery selects an active stream from the authenticated creator profile', () => {
  assert.equal(getActiveCreatorStreamId({ streams: { recent: [
    { id: 'ended-id', status: 'ended' },
    { id: 'active-id', status: 'live' },
  ] } }), 'active-id');
});

test('creator recovery rejects ended, malformed, and missing stream records', () => {
  assert.equal(getActiveCreatorStreamId({ creatorMode: true, streams: { recent: [
    { id: 'old-id', status: 'ended' },
    { status: 'live' },
    { id: 42, status: 'live' },
  ] } }), null);
  assert.equal(getActiveCreatorStreamId(null), null);
});


test('LIVE connection readiness requires a stream id, room token and LiveKit URL', () => {
  assert.equal(hasLiveConnectionCredentials({ stream: { id: 'stream-1' }, token: 'token', livekitUrl: 'wss://live.example' }), true);
  assert.equal(hasLiveConnectionCredentials({ stream: { id: 'stream-1' }, token: 'token' }), false);
  assert.equal(hasLiveConnectionCredentials({ stream: { id: 'stream-1' }, livekitUrl: 'wss://live.example' }), false);
  assert.equal(hasLiveConnectionCredentials(null), false);
});
