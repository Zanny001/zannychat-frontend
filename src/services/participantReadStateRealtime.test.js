import test from 'node:test';
import assert from 'node:assert/strict';
import { subscribeToParticipantReadState } from './participantReadStateRealtime.js';

function makeClient() {
  const subscriptions = [];
  const removed = [];
  const channel = {
    on(type, filter, callback) {
      subscriptions.push({ type, filter, callback });
      return this;
    },
    subscribe(callback) {
      callback?.('SUBSCRIBED');
      return this;
    },
  };
  return {
    subscriptions,
    removed,
    channelName: null,
    channel(name) { this.channelName = name; return channel; },
    removeChannel(value) { removed.push(value); },
    channelInstance: channel,
  };
}

test('subscribes to updates scoped to one conversation and emits participant cursors', () => {
  const client = makeClient();
  const updates = [];
  let snapshots = 0;
  const unsubscribe = subscribeToParticipantReadState({
    supabase: client,
    conversationId: 'conversation-1',
    onUpdate: (value) => updates.push(value),
    onSubscribed: () => { snapshots += 1; },
  });

  assert.equal(client.channelName, 'participant-read-state:conversation-1');
  assert.deepEqual(client.subscriptions[0].filter, {
    event: 'UPDATE',
    schema: 'public',
    table: 'conversation_participants',
    filter: 'conversation_id=eq.conversation-1',
  });
  assert.equal(snapshots, 1);
  client.subscriptions[0].callback({ new: { user_id: 'user-b', last_read_at: '2026-11-17T00:00:00Z' } });
  assert.deepEqual(updates, [{ user_id: 'user-b', last_read_at: '2026-11-17T00:00:00Z' }]);
  unsubscribe();
  client.subscriptions[0].callback({ new: { user_id: 'user-b', last_read_at: '2026-11-17T00:01:00Z' } });
  assert.equal(updates.length, 1);
  assert.deepEqual(client.removed, [client.channelInstance]);
});

test('does not subscribe when realtime or conversation identity is unavailable', () => {
  const client = makeClient();
  const noop = subscribeToParticipantReadState({ supabase: client, enabled: false, conversationId: 'c1', onUpdate() {} });
  noop();
  assert.equal(client.subscriptions.length, 0);
  assert.doesNotThrow(() => subscribeToParticipantReadState({ supabase: client, conversationId: '', onUpdate() {} })());
});
