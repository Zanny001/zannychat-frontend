import test from 'node:test';
import assert from 'node:assert/strict';
import { setPendingAuthRoute, takePendingAuthRoute } from '../navigation/pendingAuthRoute.js';

test('pending auth route preserves only allowlisted scalar link parameters', () => {
  assert.equal(setPendingAuthRoute({
    name: 'LiveStream',
    params: {
      streamId: 'stream-123',
      creatorMode: true,
      connection: { token: 'must-not-be-persisted' },
    },
  }), true);
  assert.deepEqual(takePendingAuthRoute(), {
    name: 'LiveStream',
    params: { streamId: 'stream-123', creatorMode: true },
  });
  assert.equal(takePendingAuthRoute(), null);
});

test('pending auth route rejects unapproved or incomplete links', () => {
  assert.equal(setPendingAuthRoute({ name: 'Admin', params: {} }), false);
  assert.equal(setPendingAuthRoute({ name: 'JoinGroup', params: {} }), false);
  assert.equal(takePendingAuthRoute(), null);
  assert.equal(setPendingAuthRoute({ name: 'JoinGroup', params: { token: 'invite-token' } }), true);
  assert.deepEqual(takePendingAuthRoute(), {
    name: 'JoinGroup',
    params: { token: 'invite-token' },
  });
});
