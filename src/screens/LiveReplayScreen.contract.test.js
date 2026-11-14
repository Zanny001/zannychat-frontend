import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./LiveReplayScreen.js', import.meta.url), 'utf8');
const navigator = fs.readFileSync(new URL('../navigation/AppNavigator.js', import.meta.url), 'utf8');

test('private LIVE replay player requests a short-lived authorized URL and plays in-app', () => {
  assert.ok(screen.includes("backendFetch(`/live/replays/${replayId}/playback`)"));
  assert.ok(screen.includes('useVideoPlayer'));
  assert.ok(screen.includes('player.replaceAsync({ uri: result.url })'));
  assert.ok(screen.includes('<VideoView'));
  assert.ok(screen.includes('nativeControls'));
  assert.ok(screen.includes('Refresh LIVE replay link'));
});

test('LIVE replay player is registered in the authenticated app navigator', () => {
  assert.ok(navigator.includes("import LiveReplayScreen from '../screens/LiveReplayScreen'"));
  assert.ok(navigator.includes('name="LiveReplay" component={LiveReplayScreen}'));
});
