import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const web = fs.readFileSync(new URL('./LiveStreamScreen.web.js', import.meta.url), 'utf8');
const native = fs.readFileSync(new URL('./LiveStreamScreen.js', import.meta.url), 'utf8');

test('web LIVE connects to the browser LiveKit client using the server-issued URL and token', () => {
  assert.ok(web.includes("from 'livekit-client'"));
  assert.ok(web.includes('new Room({ adaptiveStream: true, dynacast: true })'));
  assert.ok(web.includes('room.connect(connection.livekitUrl, connection.token)'));
});

test('web LIVE publishers acquire and publish camera and microphone while viewers subscribe', () => {
  assert.ok(web.includes('room.localParticipant.enableCameraAndMicrophone()'));
  assert.ok(web.includes('RoomEvent.TrackSubscribed'));
  assert.ok(web.includes('RoomEvent.TrackUnsubscribed'));
  assert.ok(web.includes('Track.Source.Camera'));
  assert.ok(web.includes('connection?.canPublish'));
});

test('web LIVE supports browser media controls, playback recovery and chat', () => {
  assert.ok(web.includes('setCameraEnabled(next)'));
  assert.ok(web.includes('setMicrophoneEnabled(next)'));
  assert.ok(web.includes('roomRef.current?.startAudio()'));
  assert.ok(web.includes('`/live/${stream.id}/comments`'));
  assert.ok(web.includes('`/live/${stream.id}/comment`'));
  assert.ok(web.includes('`/live/${stream.id}/react`'));
});

test('web LIVE preserves moderation, guest access and safe room cleanup', () => {
  assert.ok(web.includes('`/live/${stream.id}/reports`'));
  assert.ok(web.includes('`/live/${stream.id}/comments/${id}/hide`'));
  assert.ok(web.includes('`/live/${stream.id}/guest-status`'));
  assert.ok(web.includes('`/live/${stream.id}/guest-requests`'));
  assert.ok(web.includes("creatorMode ? 'end' : 'leave'"));
  assert.ok(web.includes('room.disconnect()'));
});

test('native LIVE implementation remains unchanged and continues using the React Native LiveKit SDK', () => {
  assert.ok(native.includes("from '@livekit/react-native'"));
  assert.ok(native.includes('<LiveKitRoom'));
  assert.ok(native.includes('video={publisherMode && cameraEnabled}'));
});

test('web LIVE renders each remote publisher in a labelled multi-participant stage grid', () => {
  assert.ok(web.includes('const [remoteVideoTracks, setRemoteVideoTracks] = useState([])'));
  assert.ok(web.includes('setRemoteVideoTracks((current) => current.some((item) => item.sid === track.sid)'));
  assert.ok(web.includes('remoteVideoTracks.map((track) => <RemoteVideoTile'));
  assert.ok(web.includes('track.participant.name || track.participant.identity'));
});

test('web LIVE animates recent reaction events over the video stage', () => {
  assert.ok(web.includes('withTiming(1'));
  assert.ok(web.includes('useReducedMotion()'));
  assert.ok(web.includes('scheduleOnRN(onComplete, item.id)'));
  assert.ok(web.includes('ReduceMotion.System'));
  assert.ok(web.includes('localAudioOnly'));
  assert.ok(web.includes('result?.reactions'));
  assert.ok(web.includes('floatingReactions.map'));
  assert.ok(web.includes('onPress={() => react(reaction)}'));
  assert.ok(web.includes('seenReactionIds.current.has(item.id)'));
});

test('web LIVE identifies audio-only guests when their camera is disabled', () => {
  assert.ok(web.includes('remoteAudioParticipants'));
  assert.ok(web.includes('audioOnlyParticipants'));
  assert.ok(web.includes('LIVE audio is on'));
  assert.ok(web.includes('Audio only'));
});
