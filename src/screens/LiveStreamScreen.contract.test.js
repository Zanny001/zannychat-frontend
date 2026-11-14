import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./LiveStreamScreen.js', import.meta.url), 'utf8');

test('LIVE creator and approved guest publishing roles receive media publishing controls', () => {
  assert.ok(screen.includes('connection?.canModerate'));
  assert.ok(screen.includes('moderatorMode &&'));
  assert.ok(screen.includes('video={publisherMode}'));
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
  assert.ok(screen.includes('audio={publisherMode} video={publisherMode}'));
  assert.ok(screen.includes('room.localParticipant.setCameraEnabled(nextEnabled)'));
  assert.ok(screen.includes('room.localParticipant.setMicrophoneEnabled(nextEnabled)'));
  assert.ok(screen.includes("`/live/${stream.id}/guest-status`"));
  assert.ok(screen.includes("nextConnection?.role !== 'guest'"));
  assert.ok(screen.includes("guestRequestStatus === 'requested'"));
  assert.ok(screen.includes("setGuestRequestStatus('requested')"));
  assert.ok(screen.includes("navigation.setParams({ connection: nextConnection, creatorMode: false })"));
});

test('LIVE viewers can request guest access and creators can approve or decline requests', () => {
  assert.ok(screen.includes("`/live/${stream.id}/guest-requests`"));
  assert.ok(screen.includes("`/live/${stream.id}/guest-requests/${userId}`"));
  assert.ok(screen.includes("onReviewGuestRequest(item.user_id, 'accepted')"));
  assert.ok(screen.includes("onReviewGuestRequest(item.user_id, 'declined')"));
});


test('LIVE chat displays profile names rather than truncated account identifiers', () => {
  assert.ok(screen.includes("item.user_name || 'ZannyChat user'"));
  assert.equal(screen.includes('String(item.user_id).slice(0, 7)'), false);
});

test('LIVE publishers can independently disable camera while keeping microphone audio live', () => {
  assert.ok(screen.includes('const [cameraEnabled, setCameraEnabled] = useState(publisherMode)'));
  assert.ok(screen.includes('const [microphoneEnabled, setMicrophoneEnabled] = useState(publisherMode)'));
  assert.ok(screen.includes('Turn camera off and keep audio live'));
  assert.ok(screen.includes('onToggleCamera'));
  assert.ok(screen.includes('onToggleMicrophone'));
  assert.ok(screen.includes('useRoomContext'));
  assert.ok(screen.includes('room.localParticipant.setCameraEnabled(nextEnabled)'));
  assert.ok(screen.includes('room.localParticipant.setMicrophoneEnabled(nextEnabled)'));
  assert.ok(screen.includes('audio={publisherMode} video={publisherMode}'));
});

test('LIVE stage supports multiple named video tiles in a responsive two-column grid', () => {
  assert.ok(screen.includes("numColumns={stageGridVideos.length === 1 ? 1 : 2}"));
  assert.ok(screen.includes('item.participant.name || item.participant.identity'));
  assert.ok(screen.includes('Track.Source.Microphone'));
  assert.ok(screen.includes('Audio only'));
  assert.ok(screen.includes('LIVE audio is on'));
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
  assert.ok(screen.includes('up to 5 guests'));
  assert.ok(screen.includes('onSetModerator'));
});

test('web LIVE creator stage manager has parity with native guest controls', () => {
  const webSource = fs.readFileSync(new URL('./LiveStreamScreen.web.js', import.meta.url), 'utf8');
  assert.ok(webSource.includes('/guests/invite'));
  assert.ok(webSource.includes('/mute'));
  assert.ok(webSource.includes('Manage LIVE stage'));
  assert.ok(webSource.includes('Remove guest'));
  assert.ok(webSource.includes('up to 5 guests'));
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
  assert.ok(webSource.includes('spotlight={track.participant.attributes?.zannychat_spotlight'));
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

test('LIVE video tiles use a responsive moderate 16:9 frame instead of oversized fixed heights', () => {
  const webSource = fs.readFileSync(new URL('./LiveStreamScreen.web.js', import.meta.url), 'utf8');
  assert.ok(screen.includes('aspectRatio: 16 / 9'));
  assert.ok(screen.includes('maxHeight: 315'));
  assert.ok(screen.includes('maxHeight: stageGridVideos.length === 1 ? 315 : 180'));
  assert.ok(webSource.includes('aspectRatio: 16 / 9'));
  assert.ok(webSource.includes('maxWidth: spotlight || single ? 560 : 520'));
  assert.ok(webSource.includes('single={remoteVideoTracks.length === 1}'));
  assert.ok(!webSource.includes('minHeight: spotlight ? 310 : 190'));
});
