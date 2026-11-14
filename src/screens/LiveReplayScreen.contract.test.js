import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./LiveReplayScreen.js', import.meta.url), 'utf8');
const navigator = fs.readFileSync(new URL('../navigation/AppNavigator.js', import.meta.url), 'utf8');

test('private LIVE replay player requests a signed playback URL and plays in-app', () => {
  assert.ok(screen.includes("`/live/replays/${replayId}/playback`"));
  assert.ok(screen.includes('useVideoPlayer'));
  assert.ok(screen.includes('player.replaceAsync({ uri: result.url })'));
  assert.ok(screen.includes('<VideoView'));
  assert.ok(screen.includes('nativeControls'));
  assert.ok(screen.includes('Refresh LIVE replay link'));
});

test('LIVE replay player is registered in the authenticated navigator', () => {
  assert.ok(navigator.includes("import LiveReplayScreen from '../screens/LiveReplayScreen'"));
  assert.ok(navigator.includes('name="LiveReplay" component={LiveReplayScreen}'));
});

test('all replay player actions expose explicit accessibility names', () => {
  assert.ok(screen.includes('accessibilityLabel="Go back from LIVE replay"'));
  assert.ok(screen.includes('accessibilityLabel="Refresh LIVE replay link"'));
  assert.ok(screen.includes('accessibilityLabel="Retry LIVE replay playback"'));
});

test('replay privacy copy reflects the original LIVE audience access rules', () => {
  assert.ok(screen.includes('Secure replay · audience access rules apply · seven-day expiry'));
  const liveStream = fs.readFileSync(new URL('./LiveStreamScreen.js', import.meta.url), 'utf8');
  assert.ok(liveStream.includes("access follows this LIVE's audience settings"));
  assert.ok(liveStream.includes("access follows the stream's audience settings"));
});
