import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const native = readFileSync(new URL('./GroupCallScreen.js', import.meta.url), 'utf8');
const web = readFileSync(new URL('./GroupCallScreen.web.js', import.meta.url), 'utf8');

test('native group calls keep a live participant roster visible in audio and video modes', () => {
  assert.match(native, /useParticipants\(\)/);
  assert.match(native, /IN THE ROOM/);
  assert.match(native, /participants\.map\(\(participant\)/);
  assert.match(native, /participant\.name \|\| participant\.identity/);
  assert.match(native, /participant\.isLocal \? ' · You'/);
  assert.match(native, /rosterPresence/);
});

test('web group calls render the roster from current LiveKit local and remote participants', () => {
  assert.match(web, /participantIds\.map\(\(identity\)/);
  assert.match(web, /remoteParticipants\?\.get\(identity\)/);
  assert.match(web, /participant\?\.name \|\| identity/);
  assert.match(web, /identity === roomRef\.current\?\.localParticipant\?\.identity \? ' · You'/);
  assert.match(web, /IN THE ROOM/);
  assert.match(web, /rosterPresence/);
});

test('participant roster remains a read-only presentation and does not bypass server permissions', () => {
  assert.doesNotMatch(native, /\/group-calls\/.*\/mute/);
  assert.doesNotMatch(native, /\/group-calls\/.*\/remove/);
  assert.doesNotMatch(web, /\/group-calls\/.*\/mute/);
  assert.doesNotMatch(web, /\/group-calls\/.*\/remove/);
});
