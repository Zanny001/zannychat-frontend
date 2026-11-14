import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./CallInvitePicker.js', import.meta.url), 'utf8');

test('participant picker searches through the privacy-aware profile RPC', () => {
  assert.match(source, /supabase\.rpc\('search_public_profiles'/);
  assert.match(source, /p_query: term/);
  assert.match(source, /p_limit: 25/);
  assert.match(source, /conversation_participants/);
});

test('group-call picker limits results to conversation members and excludes connected users', () => {
  assert.match(source, /filterToConversationMembers/);
  assert.match(source, /memberIds\.has\(String\(person\.id\)\)/);
  assert.match(source, /excludeIds/);
});

test('picker only sends invitations through the caller-provided authorized action', () => {
  assert.match(source, /await onInvite\(person\)/);
  assert.match(source, /accessibilityLabel=/);
  assert.match(source, /Close add people/);
});

test('room invite search excludes already joined participants using the authenticated roster endpoint', () => {
  assert.match(source, /backendFetch/);
  assert.match(source, /\/group-calls\/.*\/participants/);
  assert.match(source, /activeParticipantIds/);
});
