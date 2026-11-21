import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const direct = fs.readFileSync(new URL('./CallScreen.web.js', import.meta.url), 'utf8');
const group = fs.readFileSync(new URL('./GroupCallScreen.web.js', import.meta.url), 'utf8');

test('direct web call stops local peer connection and media before awaiting call-end persistence', () => {
  const start = direct.indexOf('const endCall = useCallback');
  const end = direct.indexOf('}, [call, isCaller, navigation]);', start);
  const handler = direct.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.ok(handler.indexOf('pcRef.current?.close()') < handler.indexOf('await updateCallStatus'));
  assert.ok(handler.indexOf('localStreamRef.current?.getTracks') < handler.indexOf('await updateCallStatus'));
  assert.ok(handler.includes('navigation.goBack();'));
  assert.doesNotMatch(handler, /endingRef.current = false/);
});

test('web group call disconnects and stops published local tracks before server leave/end request', () => {
  const start = group.indexOf('const endCall = useCallback');
  const end = group.indexOf('}, [canEnd, connection?.roomId, directCallId, navigation, roomId]);', start);
  const handler = group.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.ok(handler.indexOf('activeRoom?.disconnect()') < handler.indexOf('await updateCallStatus'));
  assert.ok(handler.indexOf('publication.track?.stop?.()') < handler.indexOf('await updateCallStatus'));
  assert.ok(handler.includes('finally {\n      navigation.goBack();'));
});
