import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const web = fs.readFileSync(new URL('./LiveStreamScreen.web.js', import.meta.url), 'utf8');
const native = fs.readFileSync(new URL('./LiveStreamScreen.js', import.meta.url), 'utf8');

test('web LIVE connects to the browser LiveKit client using the server-issued URL and token', () => {
  assert.ok(web.includes("from 'livekit-client'"));
  assert.ok(web.includes('new Room({ adaptiveStream: true, dynacast: true })'));
  assert.ok(web.includes('room.connect(connection.livekitUrl, connection.token, { autoSubscribe: true })'));
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

test('native LIVE uses the React Native LiveKit SDK and toggles published tracks directly', () => {
  assert.ok(native.includes("from '@livekit/react-native'"));
  assert.ok(native.includes('<LiveKitRoom'));
  assert.ok(native.includes('useRoomContext'));
  assert.ok(native.includes('audio={publisherMode} video={publisherMode}'));
  assert.ok(native.includes('room.localParticipant.setCameraEnabled(nextEnabled)'));
  assert.ok(native.includes('room.localParticipant.setMicrophoneEnabled(nextEnabled)'));
});

test('web LIVE renders each remote publisher in a labelled multi-participant stage grid', () => {
  assert.ok(web.includes('const [remoteVideoTracks, setRemoteVideoTracks] = useState([])'));
  assert.ok(web.includes('setRemoteVideoTracks((current) => current.some((item) => item.track.sid === track.sid)'));
  assert.ok(web.includes('const orderedRemoteTracks = [...remoteVideoTracks].sort('));
  assert.ok(web.includes('<RemoteVideoTile'));
  assert.ok(web.includes('floatingRemoteTracks.slice(0, 4)'));
  assert.ok(web.includes('mainStage'));
  assert.ok(web.includes('floating'));
  assert.ok(web.includes('participant.name || participant.identity'));
});

test('web LIVE exposes all seven supported floating reaction choices', () => {
  assert.ok(web.includes('withTiming(1'));
  assert.ok(web.includes('useReducedMotion()'));
  assert.ok(web.includes('scheduleOnRN(onComplete, item.id)'));
  assert.ok(web.includes('ReduceMotion.System'));
  assert.ok(web.includes('localAudioOnly'));
  assert.ok(web.includes('result?.reactions'));
  assert.ok(web.includes("idea: '💡'"));
  assert.ok(web.includes("support: '🙌'"));
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

test('removed web guests remain viewers after LiveKit publishing permission is revoked', () => {
  assert.ok(web.includes('RoomEvent.ParticipantPermissionsChanged'));
  assert.ok(web.includes('setDemotedToViewer(true)'));
  assert.ok(web.includes('Watching as viewer'));
  assert.ok(web.includes('You can keep watching the LIVE.'));
});


test('web LIVE creator sees incoming guest requests in an automatically refreshed actionable panel', () => {
  assert.ok(web.includes("setInterval(refreshGuestRequests, 5000)"));
  assert.ok(web.includes("if (hasNewRequest) setPanel('guestRequests')"));
  assert.ok(web.includes('Guest requests ('));
  assert.ok(web.includes("reviewGuestRequest(item.user_id, 'accepted')"));
  assert.ok(web.includes("reviewGuestRequest(item.user_id, 'declined')"));
});

test('web viewer-to-guest token handoff preserves LIVE room membership until actual navigation away', () => {
  const roomEffect = web.slice(web.indexOf('const room = new Room'), web.indexOf('  }, [stream?.id, connection?.livekitUrl, connection?.token, creatorMode, connectionLoading]'));
  assert.equal(roomEffect.includes("backendFetch(`/live/${stream.id}/${creatorMode ? 'end' : 'leave'}"), false);
  assert.ok(web.includes("navigation.addListener('beforeRemove'"));
  assert.ok(web.includes('setConnection(next)'));
});

test('web LIVE route uses a stream ID and fetches its connection after navigation', () => {
  assert.ok(web.includes('const streamId = route.params?.streamId || initialConnection?.stream?.id || null'));
  assert.ok(web.includes('`/live/${streamId}/join`'));
  assert.equal(web.includes('navigation.setParams({ connection:'), false);
});

test('web LIVE reactions refresh the server feed immediately after acceptance', () => {
  assert.ok(web.includes('if (result?.accepted) await refreshComments()'));
});


test('web LIVE uses the participant supplied by LiveKit TrackSubscribed instead of reading it from RemoteTrack', () => {
  assert.ok(web.includes('const onSubscribed = (track, publication, participant) =>'));
  assert.ok(web.includes('{ track, publication, participant }'));
  assert.ok(web.includes('participant={item.participant}'));
  assert.equal(web.includes('track.participant'), false);
});

test('web LIVE renders creator and remote guests together in one responsive stage', () => {
  assert.ok(web.includes('const mainRemoteTrack = publisherMode ? null :'));
  assert.ok(web.includes('const floatingRemoteTracks = orderedRemoteTracks.filter('));
  assert.ok(web.includes('ref={localRef}'));
  assert.ok(web.includes("creatorMode ? 'YOU · HOST' : 'YOU · GUEST'"));
  assert.ok(web.includes('<RemoteVideoTile'));
  assert.ok(web.includes('floatingRemoteTracks.slice(0, 4)'));
  assert.ok(web.includes('mainStage'));
  assert.ok(web.includes('aspectRatio: mainStage || floating ? undefined : 16 / 9'));
  assert.ok(web.includes('height: mainStage ? \'100%\' : floating ? frame.height : undefined'));
  assert.ok(web.includes('width: mainStage ? \'100%\' : floating ? frame.width :'));
  assert.ok(web.includes('PanResponder.create'));
  assert.ok(web.includes('floatingIndex={floatingIndex}'));
  assert.ok(web.includes('Resize '));
});

test('web LIVE keeps the stage accurate when remote cameras mute, unmute or unpublish', () => {
  assert.ok(web.includes('const onUnpublished = (publication, participant) =>'));
  assert.ok(web.includes('const onTrackMuted = (publication, participant) =>'));
  assert.ok(web.includes('const onTrackUnmuted = (publication, participant) =>'));
  assert.ok(web.includes('!participant.isLocal && publication.source === Track.Source.Camera'));
  assert.ok(web.includes('room.on(RoomEvent.TrackUnpublished, onUnpublished)'));
  assert.ok(web.includes('room.on(RoomEvent.TrackMuted, onTrackMuted)'));
  assert.ok(web.includes('room.on(RoomEvent.TrackUnmuted, onTrackUnmuted)'));
});

test('web LIVE explicitly keeps automatic subscription enabled and surfaces failed remote subscriptions', () => {
  assert.ok(web.includes('room.connect(connection.livekitUrl, connection.token, { autoSubscribe: true })'));
  assert.ok(web.includes('RoomEvent.TrackSubscriptionFailed'));
  assert.ok(web.includes('const onTrackSubscriptionFailed = (trackSid, participant) =>'));
});


test('web LIVE viewer presence heartbeat runs for connected waiting viewers and after reconnects', () => {
  const heartbeatEffect = web.slice(web.indexOf("if (!stream?.id) return undefined;", web.indexOf("const refreshComments")), web.indexOf("const refreshComments"));
  assert.ok(web.includes("roomRef.current?.state !== 'connected'"));
  assert.ok(web.includes('room?.on(RoomEvent.Connected, heartbeat)'));
  assert.ok(web.includes('room?.on(RoomEvent.Reconnected, heartbeat)'));
  assert.ok(web.includes('room?.off(RoomEvent.Connected, heartbeat)'));
  assert.ok(web.includes('room?.off(RoomEvent.Reconnected, heartbeat)'));
  assert.ok(web.includes('setInterval(heartbeat, 30_000)'));
});


test('web LIVE creator-only controls derive from the authenticated server role, never navigation params', () => {
  assert.ok(web.includes("const creatorMode = connection?.role === 'creator';"));
  assert.equal(web.includes('route.params?.creatorMode || connection?.role'), false);
  assert.ok(web.includes("const publisherMode = Boolean(creatorMode || (connection?.role === 'guest' && connection?.canPublish && !demotedToViewer));"));
});


test('web LIVE synchronizes initial camera and microphone controls with each server-issued publisher token', () => {
  assert.ok(web.includes('setCamera(publisherMode);'));
  assert.ok(web.includes('setMic(publisherMode);'));
});


test('web LIVE guest request polling pauses while the tab is hidden and avoids duplicate requests', () => {
  assert.ok(web.includes('const isDocumentVisible = () => typeof document === \'undefined\' || document.visibilityState !== \'hidden\''));
  assert.ok(web.includes('!isDocumentVisible() || guestRequestsRefreshInFlight.current'));
  assert.ok(web.includes('setInterval(refreshGuestRequests, 5000)'));
});


test('web LIVE disconnects and returns to LIVE Hub when the server confirms the stream has ended', () => {
  assert.ok(web.includes("['LIVE stream has ended', 'LIVE stream not found'].includes(err?.message)"));
  assert.ok(web.includes('roomRef.current?.disconnect();'));
  assert.ok(web.includes("navigation.replace('LiveHub')"));
  assert.ok(web.includes("setStatus('LIVE ended')"));
});
