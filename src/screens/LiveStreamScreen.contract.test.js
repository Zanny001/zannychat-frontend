import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./LiveStreamScreen.js', import.meta.url), 'utf8');
const webScreen = fs.readFileSync(new URL('./LiveStreamScreen.web.js', import.meta.url), 'utf8');

test('LIVE creator and approved guest publishing roles receive media publishing controls', () => {
  assert.ok(screen.includes('connection?.canModerate'));
  assert.ok(screen.includes('moderatorMode &&'));
  assert.ok(screen.includes('video={mediaVideoEnabled}'));
  assert.ok(screen.includes('room.localParticipant.setCameraEnabled(nextEnabled)'));
  assert.ok(screen.includes('onToggleCamera={toggleCamera}'));
  assert.ok(screen.includes('audio={publisherMode}'));
  assert.ok(screen.includes('room.localParticipant.setMicrophoneEnabled(nextEnabled)'));
  assert.ok(screen.includes('onToggleMicrophone={toggleMicrophone}'));
  assert.ok(screen.includes("connection?.role === 'guest'"));
});

test('LIVE moderator screen can load reports and resolve or dismiss them', () => {
  assert.ok(screen.includes('`/live/${stream.id}/reports`'));
  assert.ok(screen.includes('`/live/${stream.id}/reports/${reportId}`'));
  assert.ok(screen.includes("onReviewReport(item.id, 'reviewing')"));
  assert.ok(screen.includes("onReviewReport(item.id, 'resolved')"));
  assert.ok(screen.includes("onReviewReport(item.id, 'dismissed')"));
});

test('LIVE moderator controls can hide comments while ordinary viewers retain reporting', () => {
  assert.ok(screen.includes("moderatorMode && <TouchableOpacity onPress={() => onHide(item.id)}"));
  assert.ok(screen.includes("!creatorMode && <TouchableOpacity disabled={busy} onPress={onReport}"));
});

test('LIVE creator can appoint and remove moderators from currently joined viewers', () => {
  assert.ok(screen.includes('`/live/${stream.id}/participants`'));
  assert.ok(screen.includes("onSetModerator(item.userId, !item.moderator)"));
  assert.ok(screen.includes('`/live/${stream.id}/moderators${makeModerator ? \'\' : `/${userId}`}`'));
  assert.ok(screen.includes("method: makeModerator ? 'POST' : 'DELETE'"));
});

test('LIVE approved guests receive publishing permissions and can rejoin after creator approval', () => {
  assert.ok(screen.includes("connection?.role === 'guest'"));
  assert.ok(screen.includes('audio={publisherMode} video={mediaVideoEnabled}'));
  assert.ok(screen.includes('room.localParticipant.setCameraEnabled(nextEnabled)'));
  assert.ok(screen.includes('room.localParticipant.setMicrophoneEnabled(nextEnabled)'));
  assert.ok(screen.includes("`/live/${stream.id}/guest-status`"));
  assert.ok(screen.includes("nextConnection?.role !== 'guest'"));
  assert.ok(screen.includes("guestRequestStatus === 'requested'"));
  assert.ok(screen.includes("setGuestRequestStatus('requested')"));
  assert.ok(screen.includes("setConnection(nextConnection)"));
});

test('LIVE viewers can request guest access and creators can approve or decline requests', () => {
  assert.ok(screen.includes("`/live/${stream.id}/guest-requests`"));
  assert.ok(screen.includes("`/live/${stream.id}/guest-requests/${userId}`"));
  assert.ok(screen.includes("onReviewGuestRequest(item.user_id, 'accepted')"));
  assert.ok(screen.includes("onReviewGuestRequest(item.user_id, 'declined')"));
  assert.ok(screen.includes('item.name || item.user_id'));
  assert.ok(screen.includes('Requested to join your stage'));
});

test('native LIVE creator can permanently remove a joined viewer or guest from the room', () => {
  assert.ok(screen.includes('onRemoveParticipant'));
  assert.ok(screen.includes('Remove from LIVE'));
  assert.ok(screen.includes('participants/${userId}'));
});


test('LIVE chat displays profile names rather than truncated account identifiers', () => {
  assert.ok(screen.includes("item.user_name || 'ZannyChat user'"));
  assert.equal(screen.includes('String(item.user_id).slice(0, 7)'), false);
});

test('LIVE publishers can independently disable camera while keeping microphone audio live', () => {
  assert.ok(screen.includes('const [cameraEnabled, setCameraEnabled] = useState(mediaVideoEnabled)'));
  assert.ok(screen.includes('const [microphoneEnabled, setMicrophoneEnabled] = useState(publisherMode)'));
  assert.ok(screen.includes('Turn camera off and keep audio live'));
  assert.ok(screen.includes('onToggleCamera'));
  assert.ok(screen.includes('onToggleMicrophone'));
  assert.ok(screen.includes('useRoomContext'));
  assert.ok(screen.includes('room.localParticipant.setCameraEnabled(nextEnabled)'));
  assert.ok(screen.includes('room.localParticipant.setMicrophoneEnabled(nextEnabled)'));
  assert.ok(screen.includes('audio={publisherMode} video={mediaVideoEnabled}'));
});

test('LIVE stage uses an edge-to-edge creator canvas with floating, focusable guest video tiles', () => {
  assert.ok(screen.includes('StyleSheet.absoluteFillObject'));
  assert.ok(screen.includes('const mainStageVideo = themedVideoChat ? null : focusedStageVideo || spotlightVideo || creatorVideo || videos[0] || null'));
  assert.ok(screen.includes('const floatingGuestVideos = themedVideoChat ? videos : mainStageVideo'));
  assert.ok(screen.includes('floatingGuestVideos.slice(0, 5)'));
  assert.ok(screen.includes('function NativeFloatingGuestTile'));
  assert.ok(screen.includes('PanResponder.create'));
  assert.ok(screen.includes('width: frame.width, height: frame.height'));
  assert.ok(screen.includes('setFocusedStageIdentity(item.participant.identity)'));
  assert.ok(screen.includes('track.participant.name || track.participant.identity'));
  assert.ok(screen.includes('Track.Source.Microphone'));
  assert.ok(screen.includes('Audio only'));
  assert.ok(screen.includes('LIVE audio is on'));
  assert.ok(screen.includes('objectFit="cover"'));
});

test('native LIVE supports a distinct category-themed video chat stage and chair-based audio room', () => {
  assert.ok(screen.includes("experienceMode === 'video_chat'"));
  assert.ok(screen.includes("experienceMode === 'audio_room'"));
  assert.ok(screen.includes('LiveCategoryBackdrop'));
  assert.ok(screen.includes('NativeFloatingGuestTile'));
  assert.ok(screen.includes('💺'));
  assert.ok(screen.includes('video={mediaVideoEnabled}'));
});

test('LIVE reactions are animated over the stage and use the shared seven-reaction vocabulary', () => {
  assert.ok(screen.includes('withTiming(1'));
  assert.ok(screen.includes('useReducedMotion()'));
  assert.ok(screen.includes('scheduleOnRN(onComplete, item.id)'));
  assert.ok(screen.includes('ReduceMotion.System'));
  assert.ok(screen.includes('const hasLocalAudioOnly = publisherMode && microphoneEnabled && !cameraEnabled'));
  assert.ok(screen.includes('hasLocalAudioOnly'));
  assert.ok(screen.includes('LIVE_REACTION_EMOJI'));
  assert.ok(screen.includes("idea: '💡'"));
  assert.ok(screen.includes("support: '🙌'"));
  assert.ok(screen.includes('floatingReactions.map'));
  assert.ok(screen.includes("reaction: 'heart'") === false);
  assert.ok(screen.includes('onReact(reaction)'));
  assert.ok(screen.includes('result?.reactions'));
  assert.ok(screen.includes('seenReactionIds.current.has(item.id)'));
});


test('LIVE creator stage controls expose direct guest invitation, microphone mute, and removal', () => {
  assert.ok(screen.includes('/guests/invite'));
  assert.ok(screen.includes('/guests/'));
  assert.ok(screen.includes('/mute'));
  assert.ok(screen.includes('Invite to stage'));
  assert.ok(screen.includes('Mute mic'));
  assert.ok(screen.includes('Remove guest'));
});

test('LIVE stage actions are accessible and destructive guest removal requires confirmation', () => {
  assert.ok(screen.includes('accessibilityLabel={item.microphoneMuted ?'));
  assert.ok(screen.includes("Alert.alert('Remove guest from stage?'"));
  assert.ok(screen.includes("style: 'destructive'"));
});

test('stage panel shows the enforced guest capacity and retains moderator management', () => {
  assert.ok(screen.includes('onStageGuestCount}/5'));
  assert.ok(screen.includes('availableGuestSlots'));
  assert.ok(screen.includes('onSetModerator'));
});

test('web LIVE creator stage manager has parity with native guest controls', () => {
  const webSource = fs.readFileSync(new URL('./LiveStreamScreen.web.js', import.meta.url), 'utf8');
  assert.ok(webSource.includes('/guests/invite'));
  assert.ok(webSource.includes('/mute'));
  assert.ok(webSource.includes('label="Creator Studio"'));
  assert.ok(webSource.includes('label="Close"'));
  assert.ok(webSource.includes('Remove from LIVE'));
  assert.ok(webSource.includes("role === 'guest').length}/5</Text>"));
  assert.ok(webSource.includes('Creator Studio'));
  assert.ok(webSource.includes('Viewers listed'));
});

test('native and web LIVE screens synchronize the creator spotlight across participants', () => {
  assert.ok(screen.includes("RoomEvent.ParticipantAttributesChanged"));
  assert.ok(screen.includes('/spotlight'));
  assert.ok(screen.includes('spotlightUserId'));
  assert.ok(screen.includes('SPOTLIGHT'));
  const webSource = fs.readFileSync(new URL('./LiveStreamScreen.web.js', import.meta.url), 'utf8');
  assert.ok(webSource.includes("RoomEvent.ParticipantAttributesChanged"));
  assert.ok(webSource.includes('/spotlight'));
  assert.ok(webSource.includes('spotlightGuest'));
  assert.ok(webSource.includes('spotlight={item.participant.attributes?.zannychat_spotlight'));
});

test('removed native guests are demoted to audience mode without disconnecting', () => {
  assert.ok(screen.includes('RoomEvent.ParticipantPermissionsChanged'));
  assert.ok(screen.includes('onDemoteToViewer'));
  assert.ok(screen.includes('demotedToViewer'));
  assert.ok(screen.includes('You can keep watching the LIVE.'));
});

test('LIVE creator replay controls remain hidden unless the server enables replay', () => {
  assert.ok(screen.includes("backendFetch('/live/replays/config')"));
  assert.ok(screen.includes("`/live/${stream.id}/replays/start`"));
  assert.ok(screen.includes("`/live/${stream.id}/replays/${replay.id}/stop`"));
  assert.ok(screen.includes('creatorMode && replayEnabled'));
  assert.ok(screen.includes("replayStatus === 'recording'"));
  assert.ok(screen.includes("navigation.navigate('LiveReplay'"));
  assert.ok(screen.includes('five minutes'));
});

test('web LIVE creator exposes the same server-gated replay lifecycle and private player entry', () => {
  const web = fs.readFileSync(new URL('./LiveStreamScreen.web.js', import.meta.url), 'utf8');
  assert.ok(web.includes("backendFetch('/live/replays/config')"));
  assert.ok(web.includes("`/live/${stream.id}/replays/start`"));
  assert.ok(web.includes("`/live/${stream.id}/replays/${replay.id}/stop`"));
  assert.ok(web.includes('creatorMode && replayEnabled'));
  assert.ok(web.includes('Watch saved LIVE replay'));
  assert.ok(web.includes("navigation.navigate('LiveReplay'"));
});

test('native and web LIVE guests only activate publisher media when the server grants canPublish', () => {
  const webSource = fs.readFileSync(new URL('./LiveStreamScreen.web.js', import.meta.url), 'utf8');
  assert.ok(screen.includes("connection?.role === 'guest' && connection?.canPublish === true && !demotedToViewer"));
  assert.ok(webSource.includes("connection?.role === 'guest' && connection?.canPublish && !demotedToViewer"));
});

test('native and web LIVE stages are immersive with floating, focusable guest video tiles', () => {
  const webSource = fs.readFileSync(new URL('./LiveStreamScreen.web.js', import.meta.url), 'utf8');
  assert.ok(screen.includes('VideoTrack trackRef={mainStageVideo} objectFit="cover"'));
  assert.ok(screen.includes('VideoTrack trackRef={track} objectFit="cover"'));
  assert.ok(screen.includes('StyleSheet.absoluteFillObject'));
  assert.ok(screen.includes('function NativeFloatingGuestTile'));
  assert.ok(screen.includes('PanResponder.create'));
  assert.ok(screen.includes('width: frame.width, height: frame.height'));
  assert.ok(screen.includes('floatingGuestVideos.slice(0, 5)'));
  assert.ok(webSource.includes('mainStage'));
  assert.ok(webSource.includes('floating'));
  assert.ok(webSource.includes('floatingRemoteTracks.slice(0, 5)'));
  assert.ok(webSource.includes('setFocusedStageIdentity(item.participant.identity)'));
  assert.ok(webSource.includes('commentsVisible'));
  assert.ok(webSource.includes('showOverlayMenu'));
  assert.ok(webSource.includes('position: mainStage || floating ? \'absolute\''));
  assert.ok(webSource.includes('objectFit = \'cover\''));
  assert.ok(!webSource.includes('minHeight: 220, marginHorizontal: 12'));
});


test('LIVE creator receives continuously refreshed in-screen guest requests without relying on push notifications', () => {
  assert.ok(screen.includes("setInterval(refreshGuestRequests, 5000)"));
  assert.ok(screen.includes('if (hasNewRequest) setShowGuestRequests(true)'));
  assert.ok(screen.includes('Guest requests ({guestRequests.length})'));
  assert.ok(screen.includes("onReviewGuestRequest(item.user_id, 'accepted')"));
  assert.ok(screen.includes("onReviewGuestRequest(item.user_id, 'declined')"));
});

test('changing a viewer token to an approved guest token does not mark the participant as having left', () => {
  const cleanup = screen.slice(screen.indexOf('AudioSession.startAudioSession'), screen.indexOf('  }, [stream?.id, creatorMode, refreshComments]'));
  assert.equal(cleanup.includes("backendFetch(`/live/${stream.id}/${creatorMode ? 'end' : 'leave'}"), false);
  assert.ok(screen.includes("navigation.addListener('beforeRemove'"));
  assert.ok(screen.includes('setConnection(nextConnection)'));
});


test('native and web LIVE sessions renew participant presence and support stale reconnect', () => {
  assert.ok(screen.includes("`/live/${streamId}/heartbeat`"));
  assert.ok(screen.includes('setInterval(heartbeat, 30_000)'));
  assert.ok(screen.includes("room.state !== 'connected'"));
  const web = fs.readFileSync(new URL('./LiveStreamScreen.web.js', import.meta.url), 'utf8');
  assert.ok(web.includes("`/live/${stream.id}/heartbeat`"));
  assert.ok(web.includes('setInterval(heartbeat, 30_000)'));
  assert.ok(web.includes("roomRef.current?.state !== 'connected'"));
  assert.ok(web.includes('room?.on(RoomEvent.Connected, heartbeat)'));
  assert.ok(web.includes('room?.on(RoomEvent.Reconnected, heartbeat)'));
});


test('native LIVE screens expose audio output selection for viewers and creators', () => {
  assert.ok(screen.includes('AudioSession.showAudioRoutePicker()'));
  assert.ok(screen.includes('AudioSession.getAudioOutputs()'));
  assert.ok(screen.includes('AudioSession.selectAudioOutput(output)'));
  assert.ok(screen.includes('Choose LIVE audio output'));
});

test('LIVE navigation serializes only a stable stream ID and fetches a fresh authorized token', () => {
  assert.ok(screen.includes('const requestedStreamId = typeof route.params?.streamId === \'string\''));
  assert.ok(screen.includes('`/live/${streamId}/join`'));
  assert.equal(screen.includes('navigation.setParams({ connection:'), false);
  const hub = fs.readFileSync(new URL('./LiveHubScreen.js', import.meta.url), 'utf8');
  const preflight = fs.readFileSync(new URL('./LivePreflightScreen.js', import.meta.url), 'utf8');
  assert.ok(preflight.includes("navigation.replace('LiveStream', {"));
  assert.ok(preflight.includes('streamId: connection.stream.id'));
  assert.ok(hub.includes("navigation.navigate('LiveStream', {"));
  assert.ok(hub.includes('streamId: stream.id'));
  assert.ok(hub.includes('creatorMode: false'));
  assert.ok(hub.includes('creatorName: stream.creator_name || stream.name || null'));
  assert.equal(hub.includes("navigation.navigate('LiveStream', { connection"), false);
  assert.equal(hub.includes("navigation.navigate('LiveStream', { connection"), false);
});

test('LIVE reactions refresh the server feed immediately after an accepted reaction', () => {
  assert.ok(screen.includes('if (result?.accepted) await refreshComments()'));
  assert.ok(screen.includes('if (!stream?.id || reactionRequestInFlight.current) return'));
});


test('LIVE end and leave failures do not silently navigate away from an active room', () => {
  const leaveStart = screen.indexOf('  const leave = async () => {');
  const leaveEnd = screen.indexOf('\n\n  const sendComment', leaveStart);
  const leave = screen.slice(leaveStart, leaveEnd);
  assert.ok(leave.includes('if (!stream?.id || endedRef.current || busy) return;'));
  assert.ok(leave.includes('endedRef.current = true;'));
  assert.ok(leave.includes('catch (error)'));
  assert.ok(leave.includes('endedRef.current = false;'));
  assert.ok(leave.includes("creatorMode ? 'Could not end LIVE' : 'Could not leave LIVE'"));
  assert.ok(leave.includes('returnFromLive();'));
  const web = fs.readFileSync(new URL('./LiveStreamScreen.web.js', import.meta.url), 'utf8');
  const webLeaveStart = web.indexOf('  const leave = async () => {');
  const webLeaveEnd = web.indexOf('\n  const toggleCamera', webLeaveStart);
  const webLeave = web.slice(webLeaveStart, webLeaveEnd);
  assert.ok(webLeave.includes('endedRef.current = false;'));
  assert.ok(webLeave.includes('catch (err)'));
  assert.ok(webLeave.includes("roomRef.current?.disconnect()")); 
  assert.ok(webLeave.includes('returnFromLive();'));
});


test('LIVE navigation attempts are intercepted and use the same confirmed exit handler', () => {
  assert.ok(screen.includes("navigation.addListener('beforeRemove', (event) => {"));
  assert.ok(screen.includes('event.preventDefault();'));
  assert.ok(screen.includes('leaveRef.current?.();'));
  assert.ok(screen.includes('leaveRef.current = leave;'));
  const web = fs.readFileSync(new URL('./LiveStreamScreen.web.js', import.meta.url), 'utf8');
  assert.ok(web.includes("navigation.addListener('beforeRemove', (event) => {"));
  assert.ok(web.includes('event.preventDefault();'));
  assert.ok(web.includes('leaveRef.current?.();'));
  assert.ok(web.includes('leaveRef.current = leave;'));
});


test('native LIVE viewers explicitly auto-subscribe to creator and guest media tracks', () => {
  assert.ok(screen.includes('options={{ adaptiveStream: true, dynacast: true }} connectOptions={{ autoSubscribe: true }}'));
});


test('native LIVE stage uses a premium horizontally scrollable action rail on compact screens', () => {
  assert.ok(screen.includes('ScrollView, StatusBar'));
  assert.ok(screen.includes('showsHorizontalScrollIndicator={false}'));
  assert.ok(screen.includes("top: Math.max(insets.top + 8, Platform.OS === 'android' ? 38 : 52)"));
  assert.ok(screen.includes('StyleSheet.absoluteFillObject'));
  assert.ok(screen.includes('showOverlayMenu && <ScrollView'));
  assert.ok(screen.includes('width: 48, height: 48'));
  assert.ok(screen.includes('width: 88,\n        minHeight: 68'));
  assert.ok(screen.includes('accessibilityRole="button"'));
  assert.ok(screen.includes('accessibilityState={{ disabled, busy: loading }}'));
  assert.equal(screen.includes('minWidth: 48, height: 44'), false);
  assert.ok(screen.includes("borderColor: hexToRgba(colors.accent, 0.28)"));
  assert.ok(screen.includes("accessibilityLabel={creatorMode ? 'End LIVE broadcast' : 'Leave LIVE stream'}"));
});


test('LIVE creator-only controls derive from the authenticated server role, never navigation params', () => {
  assert.ok(screen.includes("const creatorMode = connection?.role === 'creator';"));
  assert.equal(screen.includes('route.params?.creatorMode || connection?.role'), false);
  assert.ok(screen.includes("const publisherMode = Boolean(creatorMode || (connection?.role === 'guest' && connection?.canPublish === true && !demotedToViewer));"));
});


test('native and web LIVE synchronize camera and microphone controls with each server-issued publisher token', () => {
  const web = fs.readFileSync(new URL('./LiveStreamScreen.web.js', import.meta.url), 'utf8');
  assert.ok(screen.includes('setCameraEnabled(mediaVideoEnabled);'));
  assert.ok(screen.includes('setMicrophoneEnabled(publisherMode);'));
  assert.ok(screen.includes("}, [connection?.token, mediaVideoEnabled, publisherMode]);"));
  assert.ok(web.includes('setCamera(mediaVideoEnabled);'));
  assert.ok(web.includes('setMic(publisherMode);'));
  assert.ok(web.includes('connectionLoading, experienceMode]'));
});


test('LIVE creator stage labels host and guests distinctly on native and web tiles', () => {
  assert.ok(screen.includes('creatorId={stream.creator_id}'));
  assert.ok(screen.includes("mainStageVideo.participant.identity === creatorId ? 'HOST' : 'LIVE GUEST'"));
  assert.ok(screen.includes("track.participant.identity === creatorId ? 'HOST' : spotlighted ? '✦ SPOTLIGHT' : 'GUEST'"));
  const webSource = fs.readFileSync(new URL('./LiveStreamScreen.web.js', import.meta.url), 'utf8');
  assert.ok(webSource.includes('creatorId={stream.creator_id}'));
  assert.ok(webSource.includes("participant.identity === creatorId ? 'HOST' : 'GUEST'"));
});

test('LIVE creator Studio reports only measured joined viewers, guests and remaining guest slots', () => {
  assert.ok(screen.includes("participants.filter((item) => item.joined && item.role === 'viewer').length"));
  assert.ok(screen.includes("participants.filter((item) => item.joined && item.role === 'guest').length"));
  assert.ok(screen.includes('const availableGuestSlots = Math.max(0, 5 - onStageGuestCount)'));
  assert.ok(screen.includes('Creator Studio'));
  assert.ok(screen.includes('Viewers listed'));
  assert.ok(screen.includes('accessibilityLabel="Open Creator Studio"'));
  const webSource = fs.readFileSync(new URL('./LiveStreamScreen.web.js', import.meta.url), 'utf8');
  assert.ok(webSource.includes("participants.filter((item) => item.joined && item.role === 'viewer').length"));
  assert.ok(webSource.includes("participants.filter((item) => item.joined && item.role === 'guest').length"));
  assert.ok(webSource.includes('Creator Studio'));
});


test('Creator Studio refreshes joined audience and stage counts while open, then stops polling on close', () => {
  assert.ok(screen.includes('if (!creatorMode || !showParticipants || !stream?.id) return undefined;'));
  assert.ok(screen.includes('setInterval(refreshStudioParticipants, 5_000)'));
  assert.ok(screen.includes('clearInterval(interval)'));
  const webSource = fs.readFileSync(new URL('./LiveStreamScreen.web.js', import.meta.url), 'utf8');
  assert.ok(webSource.includes("if (!creatorMode || panel !== 'stage' || !stream?.id) return undefined;"));
  assert.ok(webSource.includes('setInterval(refreshStudioParticipants, 5_000)'));
  assert.ok(webSource.includes('clearInterval(interval)'));
});


test('web Creator Studio can appoint and remove moderators with creator-only stage controls', () => {
  const webSource = fs.readFileSync(new URL('./LiveStreamScreen.web.js', import.meta.url), 'utf8');
  assert.ok(webSource.includes("const setModerator = async (userId, makeModerator)"));
  assert.ok(webSource.includes("/moderators${makeModerator ? '' : `/${userId}`}"));
  assert.ok(webSource.includes("method: makeModerator ? 'POST' : 'DELETE'"));
  assert.ok(webSource.includes("label={item.moderator ? 'Remove moderator' : 'Make moderator'}"));
  assert.ok(webSource.includes("panel === 'stage' && creatorMode"));
});


test('LIVE polling pauses in the background, avoids overlapping reads and uses gentler intervals', () => {
  assert.ok(screen.includes('const isAppForeground = () => !AppState.currentState || AppState.currentState === \'active\''));
  assert.ok(screen.includes('if (endedRef.current || !stream?.id || !isAppForeground()) return;'));
  assert.ok(screen.includes('if (commentsRefreshInFlight.current) { commentsRefreshQueued.current = true; return; }'));
  assert.ok(screen.includes('if (!active || endedRef.current || !isAppForeground() || guestStatusRefreshInFlight.current) return;'));
  assert.ok(screen.includes('if (!active || endedRef.current || !isAppForeground() || guestRequestsRefreshInFlight.current) return;'));
  assert.ok(screen.includes('if (!active || !isAppForeground() || studioParticipantsRefreshInFlight.current) return;'));
  assert.ok(screen.includes('setInterval(refreshComments, 30_000)'));
  assert.ok(screen.includes('setInterval(checkApproval, 6000)'));
  assert.ok(screen.includes('setInterval(refreshGuestRequests, 5000)'));
  assert.ok(screen.includes('if (!active || !isAppForeground() || room.state !== \'connected\' || !streamId) return;'));
});


test('web LIVE polling pauses in hidden tabs and prevents overlapping reads', () => {
  const web = fs.readFileSync(new URL('./LiveStreamScreen.web.js', import.meta.url), 'utf8');
  assert.ok(web.includes("const isDocumentVisible = () => typeof document === 'undefined' || document.visibilityState !== 'hidden'"));
  assert.ok(web.includes('if (endedRef.current || !stream?.id || !isDocumentVisible()) return;'));
  assert.ok(web.includes('if (commentsRefreshInFlight.current) { commentsRefreshQueued.current = true; return; }'));
  assert.ok(web.includes('!isDocumentVisible() || guestStatusRefreshInFlight.current'));
  assert.ok(web.includes('!isDocumentVisible() || guestRequestsRefreshInFlight.current'));
  assert.ok(web.includes('!isDocumentVisible() || studioParticipantsRefreshInFlight.current'));
  assert.ok(web.includes('setInterval(refreshComments, 30_000)'));
  assert.ok(web.includes('setInterval(check, 6000)'));
  assert.ok(web.includes('setInterval(refreshGuestRequests, 5000)'));
  assert.ok(web.includes('if (!active || !isDocumentVisible() || roomRef.current?.state !== \'connected\') return;'));
});


test('active LIVE room disconnects and clears publisher controls when auth owner changes', () => {
  assert.ok(screen.includes("import { supabase, SUPABASE_ENABLED } from '../services/supabaseClient'"));
  assert.ok(screen.includes('const liveAuthOwnerRef = useRef(undefined)'));
  assert.ok(screen.includes('const connectionRequestRef = useRef(0)'));
  assert.ok(screen.includes('supabase.auth.onAuthStateChange'));
  assert.ok(screen.includes('liveAuthOwnerRef.current === undefined'));
  assert.ok(screen.includes('liveAuthOwnerRef.current === nextUserId'));
  assert.ok(screen.includes('connectionRequestRef.current += 1'));
  assert.ok(screen.includes('endedRef.current = true'));
  assert.ok(screen.includes('setConnection(null)'));
  assert.ok(screen.includes('setCameraEnabled(false)'));
  assert.ok(screen.includes('setMicrophoneEnabled(false)'));
  assert.ok(screen.includes('setReplay(null)'));
  assert.ok(screen.includes('setDraft(\'\')'));
  assert.ok(screen.includes('setBusy(false)'));
  assert.ok(screen.includes('setReplayBusy(false)'));
  assert.ok(screen.includes('seenGuestRequestIds.current.clear()'));
  assert.ok(screen.includes('seenReactionIds.current.clear()'));
  assert.ok(screen.includes('setReports([])'));
  assert.ok(screen.includes('setShowReports(false)'));
  assert.ok(screen.includes('Your account changed. You left this LIVE.'));
  assert.ok(screen.includes('if (navigation?.canGoBack?.()) navigation.goBack()'));
  assert.ok(screen.includes('data?.subscription?.unsubscribe?.()'));
});

test('an in-flight LIVE join cannot restore the old account connection after auth changes', () => {
  assert.ok(screen.includes('const requestId = ++connectionRequestRef.current'));
  assert.ok(screen.includes('requestId === connectionRequestRef.current'));
  assert.ok(screen.includes('if (connectionRequestRef.current === requestId) connectionRequestRef.current += 1'));
});


test('native and web LIVE rooms disconnect and clear account-owned state on auth changes', () => {
  const web = fs.readFileSync(new URL('./LiveStreamScreen.web.js', import.meta.url), 'utf8');
  for (const source of [screen, web]) {
    assert.ok(source.includes("import { supabase, SUPABASE_ENABLED } from '../services/supabaseClient'"));
    assert.ok(source.includes('supabase.auth.onAuthStateChange'));
    assert.ok(source.includes('const liveAuthOwnerRef = useRef(undefined)'));
    assert.ok(source.includes('const connectionRequestRef = useRef(0)'));
    assert.ok(source.includes('connectionRequestRef.current += 1'));
    assert.ok(source.includes('endedRef.current = true'));
    assert.ok(source.includes('setConnection(null)'));
    assert.ok(source.includes('setReplay(null)'));
    assert.ok(source.includes('setComments([])'));
    assert.ok(source.includes('setGuestRequests([])'));
    assert.ok(source.includes('Your account changed. You left this LIVE.'));
    assert.ok(source.includes('requestId === connectionRequestRef.current'));
    assert.ok(source.includes('data?.subscription?.unsubscribe?.()'));
  }
  assert.ok(web.includes('roomRef.current?.disconnect()'));
  assert.ok(web.includes('setRemoteVideoTracks([])'));
  assert.ok(web.includes('setRemoteAudioParticipants([])'));
});


test('native LIVE automatically exits to the correct source when the server confirms the stream has ended', () => {
  assert.ok(screen.includes("['LIVE stream has ended', 'LIVE stream not found'].includes(e?.message)"));
  assert.ok(screen.includes("navigation.replace('Main', { screen: 'LIVE' })"));
  assert.ok(screen.includes('route.params?.returnToCreatorProfile && navigation.canGoBack()'));
  assert.ok(screen.includes('navigation.goBack()'));
  assert.ok(screen.includes('returnFromLive();'));
  assert.ok(screen.includes('setConnection(null)'));
});

test('LIVE viewers can open the public creator profile from the stage controls', () => {
  assert.ok(screen.includes('onOpenCreatorProfile'));
  assert.ok(screen.includes('accessibilityLabel="Open LIVE creator profile"'));
  assert.ok(screen.includes("navigation.navigate('LiveCreatorProfile'"));
  assert.ok(screen.includes('currentLiveStreamId: stream.id'));
  assert.ok(screen.includes('alreadyViewingLive: true'));
  assert.ok(screen.includes('route.params?.creatorName || stream.creator_name || \'LIVE Creator\''));
  assert.ok(screen.includes('avatarColor: route.params?.creatorAvatarColor || stream.creator_avatar_color'));
  assert.ok(screen.includes('onOpenCreatorProfile={openCreatorProfile}'));
});

test('web LIVE stage exposes creator profile and returns to the profile after Watch LIVE', () => {
  assert.ok(webScreen.includes('accessibilityLabel="Open LIVE creator profile"'));
  assert.ok(webScreen.includes("navigation.navigate('LiveCreatorProfile'"));
  assert.ok(webScreen.includes('currentLiveStreamId: stream.id'));
  assert.ok(webScreen.includes('alreadyViewingLive: true'));
  assert.ok(webScreen.includes('route.params?.creatorName || stream.creator_name'));
  assert.ok(webScreen.includes('route.params?.returnToCreatorProfile && navigation.canGoBack()'));
  assert.ok(webScreen.includes('returnFromLive();'));
});


test('native and web Audio LIVE Rooms render occupied chairs and explicit available seats', () => {
  assert.ok(screen.includes("Array.from({ length: Math.max(0, 6 - audioOnlyParticipants.length - (hasLocalAudioOnly ? 1 : 0)) }"));
  assert.ok(screen.includes('OPEN SEAT'));
  assert.ok(webScreen.includes("Array.from({ length: Math.max(0, 6 - audioOnlyParticipants.length - (localAudioOnly ? 1 : 0)) }"));
  assert.ok(webScreen.includes('OPEN SEAT'));
});

test('LIVE guest request and moderation surfaces render profile identity and media connection state', () => {
  const guestQueue = fs.readFileSync(new URL('./LiveGuestQueueScreen.js', import.meta.url), 'utf8');
  const moderation = fs.readFileSync(new URL('./LiveModerationScreen.js', import.meta.url), 'utf8');
  assert.ok(guestQueue.includes('item.avatarColor || colors.primary'));
  assert.ok(guestQueue.includes("item.name || 'G'"));
  assert.ok(moderation.includes('item.avatarColor || colors.primary'));
  assert.ok(moderation.includes('item.cameraEnabled === true ?'));
  assert.ok(moderation.includes("item.connectionStatus === 'connected'"));
  assert.ok(webScreen.includes('item.avatarColor || colors.primary'));
});

test('LIVE web creator roster cannot remove or appoint the host as a participant', () => {
  assert.ok(webScreen.includes("item.joined && item.role !== 'creator'"));
  assert.ok(webScreen.includes("item.role !== 'creator' && (item.moderator || item.joined)"));
});


test('native and web floating LIVE video tiles adapt to portrait and landscape viewport changes', () => {
  assert.ok(screen.includes('useWindowDimensions'));
  assert.ok(screen.includes('const boundsRef = useRef(bounds); boundsRef.current = bounds;'));
  assert.ok(screen.includes('Math.min(boundsRef.current.width - current.width'));
  assert.ok(screen.includes('Math.min(boundsRef.current.height - current.height'));
  assert.ok(webScreen.includes('useWindowDimensions'));
  assert.ok(webScreen.includes('const boundsRef = useRef(bounds); boundsRef.current = bounds;'));
  assert.ok(webScreen.includes('Math.min(boundsRef.current.width - current.width'));
  assert.ok(webScreen.includes('Math.min(boundsRef.current.height - current.height'));
});


test('native in-stage guest approval cards include requester avatar and display name', () => {
  assert.ok(screen.includes('item.avatarColor || colors.primary'));
  assert.ok(screen.includes("(item.name || 'G').trim().charAt(0).toUpperCase()"));
  assert.ok(screen.includes('Requested to join your stage'));
});


test('creator roster distinguishes the host from guest, viewer and moderator roles', () => {
  const moderation = fs.readFileSync(new URL('./LiveModerationScreen.js', import.meta.url), 'utf8');
  assert.ok(moderation.includes("item.role === 'creator' ? 'HOST'"));
});


test('native and web LIVE stages expose server-derived role hierarchy and labelled premium controls', () => {
  assert.ok(screen.includes('function LiveMenuAction('));
  assert.ok(screen.includes('const compactRoomHeader = roomViewportWidth < 390;'));
  assert.ok(screen.includes('useWindowDimensions'));
  assert.ok(screen.includes("label=\"Guest queue\""));
  assert.ok(screen.includes("label=\"Moderation\""));
  assert.ok(screen.includes("label=\"Participants\""));
  assert.ok(screen.includes("label=\"Audio output\""));
  assert.ok(screen.includes('creatorMode && replayEnabled ? <TouchableOpacity'));
  assert.ok(screen.includes("accessibilityLabel={replayStatus === 'ready' ? 'Watch saved LIVE replay'"));
  assert.ok(webScreen.includes('creatorMode && replayEnabled ? <TouchableOpacity'));
  assert.ok(webScreen.includes("accessibilityLabel={replay?.status === 'ready' ? 'Watch saved LIVE replay'"));
  assert.ok(screen.includes("creatorMode ? 'HOST' : publisherMode ? 'GUEST' : moderatorMode ? 'MODERATOR' : 'VIEWER'"));
  assert.ok(screen.includes("color: colors.textPrimary, flex: 1, minWidth: 0"));
  assert.ok(webScreen.includes("label=\"Tools\""));
  assert.ok(webScreen.includes('const compactRoomHeader = roomViewportWidth < 390;'));
  assert.ok(webScreen.includes('useWindowDimensions'));
  assert.ok(webScreen.includes("creatorMode ? 'HOST' : publisherMode ? 'GUEST' : moderatorMode ? 'MODERATOR' : 'VIEWER'"));
});


test('native and web LIVE rooms recover an active creator broadcast from the authenticated creator profile', () => {
  assert.ok(screen.includes("backendFetch('/live/creators/me/profile')"));
  assert.ok(webScreen.includes("backendFetch('/live/creators/me/profile')"));
  assert.ok(screen.includes('getActiveCreatorStreamId(profile)'));
  assert.ok(webScreen.includes('getActiveCreatorStreamId(profile)'));
  assert.ok(screen.includes('!Array.isArray(route.params.connection)'));
  assert.ok(webScreen.includes('!Array.isArray(route.params.connection)'));
});

test('creator back navigation requires explicit confirmation before ending a LIVE broadcast', () => {
  assert.ok(screen.includes("Alert.alert('End LIVE broadcast?'"));
  assert.ok(screen.includes("{ text: 'Stay LIVE', style: 'cancel'"));
  assert.ok(webScreen.includes("window.confirm('End LIVE broadcast?"));
});


test('native creator has a visible END LIVE control with confirmation; viewers only leave', () => {
  assert.ok(screen.includes("{creatorMode ? 'END LIVE' : 'LEAVE'}"));
  assert.ok(screen.includes("accessibilityLabel={creatorMode ? 'End LIVE broadcast' : 'Leave LIVE stream'}"));
  assert.ok(screen.includes("Alert.alert('End LIVE broadcast?'"));
  assert.ok(screen.includes('onEnd={creatorMode ? confirmEnd : leave}'));
});


test('native LIVE guest video tiles use an adaptive non-overlapping stage layout', () => {
  assert.ok(screen.includes("from '../utils/liveStageLayout'"));
  assert.ok(screen.includes('count={floatingGuestVideos.length}'));
  assert.ok(screen.includes('getLiveStageTileFrame({ index, count, width: bounds.width, height: bounds.height })'));
});


test('native and web creator recovery keeps the loading state until the recovered stream join resolves', () => {
  const nativeStart = screen.indexOf('    if (!streamId) {');
  const nativeEnd = screen.indexOf('    if (initialConnection?.stream?.id === streamId', nativeStart);
  const nativeRecovery = screen.slice(nativeStart, nativeEnd);
  const webStart = webScreen.indexOf('    if (!streamId) {');
  const webEnd = webScreen.indexOf('    if (initialConnection?.stream?.id === streamId', webStart);
  const webRecovery = webScreen.slice(webStart, webEnd);
  for (const recovery of [nativeRecovery, webRecovery]) {
    assert.ok(recovery.includes('let recoveredActiveStream = false;'));
    assert.ok(recovery.includes('recoveredActiveStream = true;'));
    assert.ok(recovery.includes('!recoveredActiveStream'));
    assert.equal(recovery.includes('!recoveredStreamId'), false);
  }
});


test('creator end action keeps an explicit readable END LIVE label on native and web', () => {
  assert.ok(screen.includes("{creatorMode ? 'END LIVE' : 'LEAVE'}"));
  assert.ok(screen.includes("accessibilityLabel={creatorMode ? 'End LIVE broadcast' : 'Leave LIVE stream'}"));
  const web = fs.readFileSync(new URL('./LiveStreamScreen.web.js', import.meta.url), 'utf8');
  assert.ok(web.includes("label={creatorMode ? 'END LIVE' : 'LEAVE'}"));
  assert.ok(web.includes("accessibilityLabel={creatorMode ? 'End LIVE broadcast' : 'Leave LIVE stream'}"));
});


test('native and web LIVE polling stops issuing requests and applying responses after room teardown', () => {
  for (const source of [screen, webScreen]) {
    assert.ok(source.includes('if (endedRef.current || !stream?.id'));
    assert.ok(source.includes('if (endedRef.current) return;'));
    assert.ok(source.includes('if (!active || endedRef.current || !is'));
    assert.ok(source.includes('if (active && !endedRef.current)'));
    assert.ok(source.includes('if (!active || endedRef.current) return;'));
  }
});


test('direct LIVE guest invitations require explicit accept or reject before joining the stage', () => {
  assert.ok(screen.includes("/guest-invitation"));
  assert.ok(screen.includes("guestRequestStatus === 'pending'"));
  assert.ok(screen.includes("decideGuestInvitation('accepted', 'video')"));
  assert.ok(screen.includes("decideGuestInvitation('declined')"));
  assert.ok(screen.includes("Accept LIVE guest invitation"));
  assert.ok(screen.includes("Reject LIVE guest invitation"));
  assert.ok(screen.includes("await joinAsGuest(mediaMode)"));
});


test('LIVE guest invitation supports explicit video or audio-only admission', () => {
  assert.ok(screen.includes("decideGuestInvitation('accepted', 'video')"));
  assert.ok(screen.includes("decideGuestInvitation('accepted', 'audio')"));
  assert.ok(screen.includes("body: JSON.stringify({ mediaMode })"));
  assert.ok(screen.includes("connection?.mediaMode !== 'audio'"));
  assert.ok(screen.includes("mediaMode={connection?.mediaMode || 'video'}"));
});


test('native LIVE room exposes a real share action with the stream deep link', () => {
  assert.ok(screen.includes('Share.share('));
  assert.ok(screen.includes('https://zannychat.vercel.app/LiveStream?streamId='));
  assert.ok(screen.includes('label="Share LIVE"'));
  assert.ok(screen.includes('onShare={shareLiveStream}'));
});


test('native LIVE room exposes a named clean mode that hides the chat overlay', () => {
  assert.ok(screen.includes("label={showComments ? 'Clean mode' : 'Exit clean mode'}"));
  assert.ok(screen.includes("setShowComments((value) => !value)"));
});


test('native LIVE room lets viewers suppress future recommendations from the current creator', () => {
  assert.ok(screen.includes("/not-interested"));
  assert.ok(screen.includes("label=\"Not interested\""));
  assert.ok(screen.includes("onNotInterested={markNotInterested}"));
  assert.ok(screen.includes("We will show fewer LIVE streams from this creator."));
});


test('native LIVE room exposes an account-level block action that leaves the active stream', () => {
  assert.ok(screen.includes("import { blockUser, getCurrentUser } from '../services/api'"));
  assert.ok(screen.includes("label=\"Block creator\""));
  assert.ok(screen.includes("await blockUser(stream.creator_id)"));
  assert.ok(screen.includes("await leave()"));
});


test('native LIVE room quality control applies LiveKit remote publication quality caps', () => {
  assert.ok(screen.includes("VideoQuality.LOW"));
  assert.ok(screen.includes("VideoQuality.MEDIUM"));
  assert.ok(screen.includes("VideoQuality.HIGH"));
  assert.ok(screen.includes("publication.setVideoQuality(quality)"));
  assert.ok(screen.includes("label={`Quality · ${qualityMode.toUpperCase()}`}"));
});


test('native guest-request approvals let viewers choose video or audio before joining', () => {
  assert.ok(screen.includes("Alert.alert('Join LIVE stage'"));
  assert.ok(screen.includes("onJoinGuest?.('video')"));
  assert.ok(screen.includes("onJoinGuest?.('audio')"));
  assert.ok(screen.includes("Choose audio or video to join LIVE as guest"));
});


test('native guest invitation prompt identifies the inviting creator when available', () => {
  assert.ok(screen.includes("stream?.creator_name || route.params?.creatorName || 'The LIVE creator'"));
});
