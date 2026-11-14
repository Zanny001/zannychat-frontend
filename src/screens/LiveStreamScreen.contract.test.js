import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./LiveStreamScreen.js', import.meta.url), 'utf8');

test('LIVE creator and approved guest publishing roles receive media publishing controls', () => {
  assert.ok(screen.includes('connection?.canModerate'));
  assert.ok(screen.includes('moderatorMode &&'));
  assert.ok(screen.includes('video={publisherMode && cameraEnabled}'));
  assert.ok(screen.includes('onToggleCamera={toggleCamera}'));
  assert.ok(screen.includes('audio={publisherMode && microphoneEnabled}'));
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
  assert.ok(screen.includes('audio={publisherMode && microphoneEnabled}'));
  assert.ok(screen.includes('video={publisherMode && cameraEnabled}'));
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
  assert.ok(screen.includes("numColumns={videos.length === 1 ? 1 : 2}"));
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
