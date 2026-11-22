import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (name) => fs.readFileSync(new URL(`./${name}`, import.meta.url), 'utf8');

test('LIVE hub primary controls keep consistent 48-point targets', () => {
  const source = read('LiveHubScreen.js');
  assert.match(source, /minHeight: 48, paddingHorizontal: 10/);
  assert.match(source, /width: 48, height: 48, borderRadius: 15/);
  assert.match(source, /minHeight: 48, paddingHorizontal: spacing\.md, borderRadius: 18/);
  assert.match(source, /minHeight: 52/);
  assert.match(source, /borderRadius: radii\.md/);
  assert.ok(source.includes("accessibilityLabel={activeCreatorStreamId ? 'Rejoin active LIVE broadcast' : 'Go LIVE'}"));
});

test('Native LIVE stage uses immersive full-screen video with floating guests and accessible controls', () => {
  const source = read('LiveStreamScreen.js');
  assert.match(source, /StyleSheet\.absoluteFillObject/);
  assert.match(source, /VideoTrack trackRef=\{mainStageVideo\} objectFit="cover"/);
  assert.match(source, /VideoTrack trackRef=\{track\} objectFit="cover"/);
  assert.match(source, /floatingGuestVideos\.slice\(0, 5\)/);
  assert.match(source, /function NativeFloatingGuestTile/);
  assert.match(source, /width: 88,[\s\S]*?minHeight: 68,[\s\S]*?alignItems: 'center'/);
  assert.match(source, /accessibilityState=\{\{ disabled, busy: loading \}\}/);
  assert.match(source, /minHeight: 48, minWidth: 132/);
});

test('Web LIVE actions and moderation controls keep 48-point targets', () => {
  const source = read('LiveStreamScreen.web.js');
  assert.match(source, /minHeight: 48, paddingHorizontal: 13/);
  assert.match(source, /minWidth: 48, minHeight: 48, justifyContent: 'center'/);
  assert.match(source, /aspectRatio: mainStage \|\| floating \? undefined : 16 \/ 9/);
  assert.match(source, /height: mainStage \? '100%' : floating \? frame.height : undefined/);
  assert.match(source, /width: mainStage \? '100%' : floating \? frame.width :/);
});

test('Native and web call invite actions are not undersized', () => {
  for (const name of ['CallScreen.js', 'CallScreen.web.js']) {
    const source = read(name);
    assert.match(source, /addPeopleButton: \{ width: 48, height: 48, minWidth: 48, minHeight: 48/);
    assert.match(source, /control: \{ width: 64, minWidth: 64, height: 68, minHeight: 64/);
  }
});

test('Group call stages remain bounded instead of expanding into oversized panels', () => {
  const native = read('GroupCallScreen.js');
  const web = read('GroupCallScreen.web.js');
  assert.match(native, /tile: \{ flex: 1, minHeight: 190/);
  assert.match(native, /control: \{ minWidth: 68, minHeight: 68/);
  assert.match(web, /videoTile: \{ width: '47%', minWidth: 145, aspectRatio: 9 \/ 16, maxHeight: 330/);
  assert.match(web, /control: \{ minWidth: 68, minHeight: 64/);
});

test('LIVE replay player remains 16:9 and bounded on wide screens with 48-point actions', () => {
  const source = read('LiveReplayScreen.js');
  assert.match(source, /width: 48, height: 48/);
  assert.match(source, /maxWidth: 720, maxHeight: 405, alignSelf: 'center', aspectRatio: 16 \/ 9/);
  assert.match(source, /minHeight: 48, marginTop: 16/);
});
