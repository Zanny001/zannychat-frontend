import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./LiveStreamScreen.js', import.meta.url), 'utf8');

test('LIVE creator and approved guest publishing roles receive media publishing controls', () => {
  assert.ok(screen.includes('connection?.canModerate'));
  assert.ok(screen.includes('moderatorMode &&'));
  assert.ok(screen.includes('video={publisherMode}'));
  assert.ok(screen.includes('audio={publisherMode}'));
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
  assert.ok(screen.includes('audio={publisherMode}'));
  assert.ok(screen.includes('video={publisherMode}'));
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


test('LIVE publishers can disable video independently while keeping microphone audio enabled', () => {
  assert.ok(screen.includes('useLocalParticipant'));
  assert.ok(screen.includes('localParticipant.setCameraEnabled(!isCameraEnabled)'));
  assert.ok(screen.includes('localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)'));
  assert.ok(screen.includes("accessibilityLabel={isCameraEnabled ? 'Turn camera off and keep audio on' : 'Turn camera on'}"));
  assert.ok(screen.includes('audio={publisherMode}'));
});

test('LIVE stage renders multiple camera publishers in a responsive two-column grid', () => {
  assert.ok(screen.includes("numColumns={videos.length > 1 ? 2 : 1}"));
  assert.ok(screen.includes("key={videos.length > 1 ? 'live-stage-grid' : 'live-stage-single'}"));
  assert.ok(screen.includes('item.participant.name || item.participant.identity'));
});
