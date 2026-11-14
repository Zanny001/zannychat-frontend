import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const native = fs.readFileSync(new URL('./CallScreen.js', import.meta.url), 'utf8');
const web = fs.readFileSync(new URL('./CallScreen.web.js', import.meta.url), 'utf8');

test('native one-to-one calls can be promoted to a multi-party LiveKit room', () => {
  assert.match(native, /CallInvitePicker/);
  assert.match(native, /\/group-calls\/upgrade\//);
  assert.match(native, /group_room_id/);
  assert.match(native, /navigation\.replace\('GroupCall'/);
  assert.match(native, /reportNativeCallEnded/);
  assert.match(native, /releaseCallAudioSessionRef/);
});

test('native call session updates and backfill both detect conference promotion', () => {
  assert.match(native, /if \(next\.group_room_id\)/);
  assert.match(native, /group_room_id'\)/);
});

test('web one-to-one calls can be promoted and automatically enter the web conference screen', () => {
  assert.match(web, /CallInvitePicker/);
  assert.match(web, /\/group-calls\/upgrade\//);
  assert.match(web, /if \(next\.group_room_id\)/);
  assert.match(web, /navigation\.replace\('GroupCall'/);
  assert.match(web, /group_room_id/);
});
