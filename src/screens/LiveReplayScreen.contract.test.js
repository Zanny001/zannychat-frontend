import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./LiveReplayScreen.js', import.meta.url), 'utf8');
const navigator = fs.readFileSync(new URL('../navigation/AppNavigator.js', import.meta.url), 'utf8');
const premiumHeader = fs.readFileSync(new URL('../components/LivePremiumHeader.js', import.meta.url), 'utf8');

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
  assert.ok(screen.includes('backLabel="Go back from LIVE replay"'));
  assert.ok(screen.includes('refreshLabel="Refresh LIVE replay link"'));
  assert.ok(premiumHeader.includes('accessibilityLabel={backLabel}'));
  assert.ok(premiumHeader.includes('accessibilityLabel={refreshLabel}'));
  assert.ok(screen.includes('accessibilityLabel="Retry LIVE replay playback"'));
});

test('replay privacy copy reflects the original LIVE audience access rules', () => {
  assert.ok(screen.includes('Secure replay · audience access rules apply · seven-day expiry'));
  const liveStream = fs.readFileSync(new URL('./LiveStreamScreen.js', import.meta.url), 'utf8');
  assert.ok(liveStream.includes("access follows this LIVE's audience settings"));
  assert.ok(liveStream.includes("access follows the stream's audience settings"));
});


test('LIVE replay deletion control is shown only to the authenticated creator', () => {
  assert.ok(screen.includes("import { getCurrentUser } from '../services/api';"));
  assert.ok(screen.includes('const [currentUserId, setCurrentUserId] = useState(null)'));
  assert.ok(screen.includes('getCurrentUser().then((user) =>'));
  assert.ok(screen.includes('replay?.creatorId && replay.creatorId === currentUserId'));
});


test('private replay playback is revoked from the visible player when the auth owner changes', () => {
  assert.ok(screen.includes("import { supabase, SUPABASE_ENABLED } from '../services/supabaseClient'"));
  assert.ok(screen.includes('supabase.auth.onAuthStateChange'));
  assert.ok(screen.includes('const nextUserId = session?.user?.id || null'));
  assert.ok(screen.includes('currentUserIdRef.current === nextUserId'));
  assert.ok(screen.includes('player.pause()'));
  assert.ok(screen.includes('setPlaybackUrl(null)'));
  assert.ok(screen.includes("setError(nextUserId ? '' : 'Sign in to access this LIVE replay.')"));
  assert.ok(screen.includes('if (!currentUserId)'));
  assert.ok(screen.includes('}, [replayId, attempt, player, currentUserId])'));
  assert.ok(screen.includes('data?.subscription?.unsubscribe?.()'));
});


test('Supabase auth events are the single source for initial and changed replay identity', () => {
  assert.ok(screen.includes('if (SUPABASE_ENABLED && supabase?.auth?.onAuthStateChange)'));
  assert.ok(screen.includes('Supabase emits INITIAL_SESSION through this same listener'));
  assert.ok(screen.includes('// Mock mode has no Supabase auth event source.'));
  const mockFallback = screen.indexOf('// Mock mode has no Supabase auth event source.');
  const identityLookup = screen.indexOf('getCurrentUser().then((user) =>');
  assert.ok(mockFallback >= 0 && identityLookup > mockFallback);
});
