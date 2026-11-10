import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./GroupCallScreen.js', import.meta.url), 'utf8');

test('group call releases a successful join when the screen unmounts before connection resolves', () => {
  assert.ok(screen.includes('else if (result?.room?.id)'));
  assert.ok(screen.includes('`/group-calls/${result.room.id}/leave`'));
});

test('group call cleanup releases an established participant unless explicit leave/end is already running', () => {
  assert.ok(screen.includes('if (current?.roomId && !endingRef.current)'));
  assert.ok(screen.includes('`/group-calls/${current.roomId}/leave`'));
  assert.ok(screen.includes('endingRef.current = true'));
});

test('group call end action ends host rooms and leaves non-host rooms', () => {
  assert.ok(screen.includes('connection.room?.host_user_id === data?.user?.id'));
  assert.ok(screen.includes("isHost ? 'end' : 'leave'"));
});
