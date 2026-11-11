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


test('Expo metadata points at the current production backend hostname', () => {
  assert.ok(appConfig.includes('https://zannychat-backend-1.onrender.com'));
  assert.equal(appConfig.includes('https://zannychat-backend.onrender.com'), false);
});
