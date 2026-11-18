import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const api = readFileSync(new URL('./api.js', import.meta.url), 'utf8');
const conversationListRealtime = readFileSync(
  new URL('./conversationListRealtime.js', import.meta.url),
  'utf8'
);
const participantReadStateRealtime = readFileSync(
  new URL('./participantReadStateRealtime.js', import.meta.url),
  'utf8'
);

test('api explicitly imports the conversation-list realtime helper it invokes', () => {
  assert.match(
    api,
    /import\s*\{\s*subscribeToConversationListEvents\s*\}\s*from\s*['"]\.\/conversationListRealtime['"]/
  );
  assert.match(conversationListRealtime, /export\s+function\s+subscribeToConversationListEvents\s*\(/);
  assert.match(api, /subscribeToConversationListEvents\s*\(/);
});

test('api explicitly imports the participant read-state realtime helper it invokes', () => {
  assert.match(
    api,
    /import\s*\{\s*subscribeToParticipantReadState\s*\}\s*from\s*['"]\.\/participantReadStateRealtime['"]/
  );
  assert.match(participantReadStateRealtime, /export\s+function\s+subscribeToParticipantReadState\s*\(/);
  assert.match(api, /subscribeToParticipantReadState\s*\(/);
});
