import test from 'node:test';
import assert from 'node:assert/strict';
import { subscribeToConversationListEvents } from './conversationListRealtime.js';

function makeRealtimeClient() {
  const subscriptions = [];
  const removed = [];
  const channel = {
    on(type, filter, callback) {
      subscriptions.push({ type, filter, callback });
      return this;
    },
    subscribe() { return this; },
  };
  return {
    subscriptions,
    removed,
    channel(name) { this.channelName = name; return channel; },
    removeChannel(value) { removed.push(value); },
    channelInstance: channel,
  };
}

test('inbox subscribes to message and participant changes and removes the channel on cleanup', () => {
  const client = makeRealtimeClient();
  const events = [];
  const unsubscribe = subscribeToConversationListEvents({
    supabase: client,
    enabled: true,
    onChange: (event) => events.push(event),
  });

  assert.equal(client.channelName, 'conversation-list');
  assert.deepEqual(client.subscriptions.map((item) => [item.type, item.filter.table]), [
    ['postgres_changes', 'messages'],
    ['postgres_changes', 'conversation_participants'],
  ]);
  client.subscriptions[0].callback({ eventType: 'INSERT', new: { conversation_id: 'c1' } });
  assert.equal(events.length, 1);
  unsubscribe();
  assert.deepEqual(client.removed, [client.channelInstance]);
});

test('does not create a channel when realtime is disabled or no client is configured', () => {
  let channelCalls = 0;
  const client = { channel() { channelCalls += 1; } };
  const noop = subscribeToConversationListEvents({ supabase: client, enabled: false, onChange() {} });
  noop();
  assert.equal(channelCalls, 0);
  assert.doesNotThrow(() => subscribeToConversationListEvents({ supabase: null, enabled: true, onChange() {} })());
});

test('does not subscribe without a callback', () => {
  const client = makeRealtimeClient();
  subscribeToConversationListEvents({ supabase: client, enabled: true });
  assert.equal(client.subscriptions.length, 0);
});
