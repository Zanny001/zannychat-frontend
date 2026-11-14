import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./GroupCallScreen.js', import.meta.url), 'utf8');

test('native ongoing group calls expose a privacy-filtered add-people workflow', () => {
  assert.match(source, /CallInvitePicker/);
  assert.match(source, /group-call.*invite/);
  assert.match(source, /filterToConversationMembers=\{!connection\.room\.source_call_id\}/);
  assert.match(source, /excludeIds=\{participantIds\}/);
});

test('native conference permissions distinguish direct conferences from group calls', () => {
  assert.match(source, /connection\.room\.source_call_id/);
  assert.match(source, /setCanEnd\(true\)/);
  assert.match(source, /canInviteNow/);
  assert.match(source, /endLabel=\{canEnd \? 'End call' : 'Leave'\}/);
});
