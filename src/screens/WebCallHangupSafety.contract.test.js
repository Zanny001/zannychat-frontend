import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const direct = fs.readFileSync(new URL('./CallScreen.web.js', import.meta.url), 'utf8');
const group = fs.readFileSync(new URL('./GroupCallScreen.web.js', import.meta.url), 'utf8');

test('direct web call stops local media and navigates away before best-effort call-end persistence', () => {
  const start = direct.indexOf('const endCall = useCallback');
  const end = direct.indexOf('}, [call, isCaller, navigation]);', start);
  const handler = direct.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.ok(handler.indexOf('pcRef.current?.close()') < handler.indexOf('navigation.goBack();'));
  assert.ok(handler.indexOf('localStreamRef.current?.getTracks') < handler.indexOf('navigation.goBack();'));
  assert.ok(handler.indexOf('navigation.goBack();') < handler.indexOf('updateCallStatus(current.id, nextStatus)'));
  assert.doesNotMatch(handler, /endingRef.current = false/);
});

test('web group call disconnects and stops published local tracks before immediate navigation', () => {
  const start = group.indexOf('const endCall = useCallback');
  const end = group.indexOf('}, [canEnd, connection?.roomId, directCallId, navigation, roomId]);', start);
  const handler = group.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.ok(handler.indexOf('activeRoom?.disconnect()') < handler.indexOf('navigation.goBack();'));
  assert.ok(handler.indexOf('publication.track?.stop?.()') < handler.indexOf('navigation.goBack();'));
  assert.ok(handler.indexOf('navigation.goBack();') < handler.indexOf('const persistLeave'));
  assert.match(handler, /Promise.resolve(persistLeave).catch/);
});

test('web video-call camera startup failure falls back to microphone-only calling', () => {
  assert.match(direct, /recoverableCameraErrors = \['NotAllowedError', 'NotFoundError', 'NotReadableError', 'OverconstrainedError', 'AbortError'\]/);
  assert.match(direct, /getUserMedia\(\{ audio: true, video: false \}\)/);
  assert.match(direct, /setCameraOff\(true\)/);
  assert.match(direct, /setActiveCallType\('audio'\)/);
  assert.match(direct, /call continues with audio/);
  assert.match(direct, /setMediaNotice\(''\)/);
});
