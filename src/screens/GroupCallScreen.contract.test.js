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


test('group call surfaces participant presence and live connection recovery state', () => {
  assert.ok(screen.includes('useParticipants'));
  assert.ok(screen.includes('RoomEvent.Reconnecting'));
  assert.ok(screen.includes('RoomEvent.Reconnected'));
  assert.ok(screen.includes('participants.length'));
  assert.ok(screen.includes('participant.name || participant.identity'));
});

test('group call actions use accessible Pressable controls with selected and pressed feedback', () => {
  assert.ok(screen.includes('Pressable'));
  assert.equal(screen.includes('TouchableOpacity'), false);
  assert.ok(screen.includes('accessibilityState={{ selected: muted }}'));
  assert.ok(screen.includes('accessibilityState={{ selected: cameraOff }}'));
  assert.ok(screen.includes('pressed && { opacity: 0.76'));
});

test('group call UI avoids claiming end-to-end or secure-room guarantees', () => {
  assert.equal(screen.includes('secure call room'), false);
  assert.ok(screen.includes('Everyone in the room can hear you'));
});
