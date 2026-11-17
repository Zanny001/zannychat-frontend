import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./StatusUpdatesScreen.js', import.meta.url), 'utf8');
const service = fs.readFileSync(new URL('../services/statusUpdates.js', import.meta.url), 'utf8');
const appConfig = fs.readFileSync(new URL('../../app.json', import.meta.url), 'utf8');

test('Stories screen presents contact story rings and a privacy-safe contact discovery shelf', () => {
  assert.ok(screen.includes('friendStatusGroups'));
  assert.ok(screen.includes('firstUnseenStatus(group.statuses, seenStatusIds, item)'));
  assert.ok(screen.includes('discoverStatuses'));
  assert.ok(screen.includes('Fresh moments shared by your contacts'));
});

test('Stories camera action requests native or browser camera permission', () => {
  assert.ok(screen.includes('ImagePicker.requestCameraPermissionsAsync()'));
  assert.ok(screen.includes('ImagePicker.launchCameraAsync'));
  assert.ok(screen.includes('navigator.mediaDevices?.getUserMedia'));
  assert.ok(screen.includes('canvas.toBlob'));
  assert.equal(screen.includes('Camera capture is available in the ZannyChat mobile app.'), false);
});

test('Status publishing keeps the server-timed RPC and existing media publishing paths', () => {
  assert.ok(service.includes("supabase.rpc('create_status_update'"));
  assert.ok(screen.includes('publishTextStatus'));
  assert.ok(screen.includes('publishPhotoStatus'));
  assert.ok(screen.includes('publishVideoStatus'));
});


test('Status video picker exports H.264 720p and upload supports MP4 plus QuickTime MOV', () => {
  assert.ok(screen.includes('videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720'));
  assert.ok(service.includes("'video/quicktime'"));
  assert.ok(service.includes("'video/mp4'"));
  assert.ok(service.includes('video.${extension}'));
  assert.ok(service.includes('Choose an MP4 or MOV video.'));
});

test('Status photo publishing supports native HEIC/HEIF and GIF picker formats', () => {
  for (const mime of ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']) {
    assert.ok(service.includes(`'${mime}'`));
  }
  assert.ok(service.includes('Choose a JPG, PNG, WebP, GIF, HEIC, or HEIF photo.'));
  assert.ok(service.includes("'image/heic': 'heic'"));
  assert.ok(service.includes("'image/heif': 'heif'"));
});

test('Expo metadata points at the current production backend hostname', () => {
  assert.ok(appConfig.includes('https://zannychat-backend-1.onrender.com'));
  assert.equal(appConfig.includes('https://zannychat-backend.onrender.com'), false);
});

test('Status view receipts use conflict-ignore upsert so repeated opens stay idempotent without duplicate-key errors', () => {
  assert.ok(service.includes(".from('status_views').upsert("));
  assert.ok(service.includes("{ onConflict: 'status_id,viewer_id', ignoreDuplicates: true }"));
  assert.equal(service.includes(".from('status_views').insert("), false);
});

test('My status ring prioritizes the signed-in profile photo over the latest story media', () => {
  assert.ok(screen.includes("import { getCurrentUser } from '../services/api';"));
  assert.ok(screen.includes('getCurrentUser()'));
  assert.ok(screen.includes('setMyProfile(profile)'));
  const start = screen.indexOf('accessibilityLabel="Open or create your status"');
  const end = screen.indexOf('</TouchableOpacity>', start);
  const ownStatus = screen.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.ok(ownStatus.indexOf('myProfile?.avatarUrl') >= 0);
  assert.ok(ownStatus.indexOf('myProfile?.avatarUrl') < ownStatus.indexOf('ownStatusGroup?.latest?.media_url'));
});


test('account changes clear Status reactions, replies, privacy selections and active overlays', () => {
  assert.ok(screen.includes('setReactingStatusIds([])'));
  assert.ok(screen.includes('reactionLocksRef.current.clear()'));
  assert.ok(screen.includes('setRepliesHasMore(false)'));
  assert.ok(screen.includes('setReplyCursor(null)'));
  assert.ok(screen.includes('setReplyText(\'\')'));
  assert.ok(screen.includes('setSendingReply(false)'));
  assert.ok(screen.includes('replyPageLockRef.current = false'));
  assert.ok(screen.includes('setPrivacyContacts([])'));
  assert.ok(screen.includes('setPrivacyModalOpen(false)'));
  assert.ok(screen.includes('setPrivacyBusy(false)'));
  assert.ok(screen.includes('setPrivacyLoadError(\'\')'));
  assert.ok(screen.includes('setPrivacySearch(\'\')'));
  assert.ok(screen.includes("setPrivacyMode('exclude')"));
  assert.ok(screen.includes('setSelectedAudienceIds([])'));
  assert.ok(screen.includes('setStatusPaused(false)'));
  assert.ok(screen.includes('setMediaLoadError(false)'));
  assert.ok(screen.includes('requestedStoryOpenRef.current = null'));
});
