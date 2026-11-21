import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const native = fs.readFileSync(new URL('./LiveStreamScreen.js', import.meta.url), 'utf8');
const web = fs.readFileSync(new URL('./LiveStreamScreen.web.js', import.meta.url), 'utf8');

test('creator replay recording has a visible 48-point native header action', () => {
  const headerEnd = native.indexOf('{showOverlayMenu &&');
  const header = native.slice(native.indexOf("position: 'absolute', zIndex: 20"), headerEnd);
  assert.ok(header.includes('creatorMode && replayEnabled ? <TouchableOpacity'));
  assert.ok(header.includes('minWidth: 52, height: 48'));
  assert.ok(header.includes('accessibilityLabel={replayStatus ==='));
  assert.ok(header.includes('Start LIVE replay recording'));
});

test('creator replay recording has a visible 48-point web header action', () => {
  const headerEnd = web.indexOf('{showOverlayMenu &&');
  const headerStart = web.indexOf("position: 'absolute', top: insets.top");
  const header = web.slice(headerStart, headerEnd);
  assert.ok(header.includes('creatorMode && replayEnabled ? <TouchableOpacity'));
  assert.ok(header.includes('minWidth: 52, height: 48'));
  assert.ok(header.includes('accessibilityLabel={replay?.status ==='));
  assert.ok(header.includes('Start LIVE replay recording'));
});

test('visible replay action preserves explicit consent and recording state actions', () => {
  assert.ok(native.includes("Alert.alert(\"Record this LIVE?\""));
  assert.ok(native.includes("replayStatus === 'recording' ? onStopReplay : onStartReplay"));
  assert.ok(web.includes("replay?.status === 'recording' ? stopReplay() : confirmStartReplay()"));
});
