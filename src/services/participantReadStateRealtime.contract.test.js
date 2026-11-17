import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync(new URL('./api.js', import.meta.url), 'utf8');
const start = api.indexOf('export function subscribeToParticipantUpdates(conversationId, onUpdate) {');
const end = api.indexOf('// Starts a conversation with a contact.', start);
const implementation = api.slice(start, end);

test('participant read-state snapshot starts only after the realtime channel is subscribed', () => {
  assert.ok(start >= 0);
  assert.match(implementation, /subscribeToParticipantReadState/);
  assert.match(implementation, /onSubscribed:s*()s*=>/);
  assert.match(implementation, /fetchParticipantReadState(conversationId)/);
  assert.doesNotMatch(implementation, /setInterval/);
});

test('participant read-state updates ignore stale snapshots after newer realtime events', () => {
  assert.match(implementation, /latestByUser/);
  assert.match(implementation, /Date\.parse\(last_read_at\) < Date\.parse\(previous\)/);
  assert.match(implementation, /active = false/);
});
