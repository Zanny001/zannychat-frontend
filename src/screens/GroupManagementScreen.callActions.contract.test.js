import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('./GroupManagementScreen.js', import.meta.url), 'utf8');
const groupCall = readFileSync(new URL('./GroupCallScreen.js', import.meta.url), 'utf8');

test('group management offers direct audio and video call entry points', () => {
  assert.match(screen, /accessibilityLabel="Start a group voice call"/);
  assert.match(screen, /accessibilityLabel="Start a group video call"/);
  assert.match(screen, /callType: 'audio'/);
  assert.match(screen, /callType: 'video'/);
  assert.match(screen, /navigation\.navigate\('GroupCall'/);
  assert.match(screen, /minHeight: 50/);
});

test('group call entry points use the existing conversation-scoped LiveKit join flow', () => {
  assert.match(screen, /conversationId, conversationName: groupMetadata\.name/);
  assert.match(groupCall, /body: JSON\.stringify\(\{ conversationId, callType \}\)/);
  assert.match(groupCall, /backendFetch\('\/group-calls\/join'/);
  assert.match(groupCall, /conversationId/);
});
