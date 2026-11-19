import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./PeerProfileScreen.js', import.meta.url), 'utf8');
const hub = fs.readFileSync(new URL('./LiveHubScreen.js', import.meta.url), 'utf8');
const navigator = fs.readFileSync(new URL('../navigation/AppNavigator.js', import.meta.url), 'utf8');

test('LIVE Creator Profile reuses the privacy-aware peer profile and LIVE impact card', () => {
  assert.ok(navigator.includes('name="LiveCreatorProfile" component={PeerProfileScreen}'));
  assert.ok(navigator.includes('name="LiveCreatorStudio" component={LiveCreatorStudioScreen}'));
  assert.ok(source.includes('const fromLive = route.params?.fromLive === true'));
  assert.ok(source.includes('<LiveImpactCard impact={liveImpact} />'));
  assert.ok(source.includes("Header title={fromLive ? \"LIVE Creator\" : \"Profile\"}"));
});

test('LIVE Creator Profile exposes authenticated follow and watch actions only in LIVE context', () => {
  assert.ok(source.includes('`/live/creators/${targetCreatorId}/follow`'));
  assert.ok(source.includes("method: nextFollowing ? 'POST' : 'DELETE'"));
  assert.ok(source.includes("navigation.navigate('LiveStream', { streamId: currentLiveStreamId, creatorMode: false, returnToCreatorProfile: true })"));
  assert.ok(source.includes('{fromLive ? ('));
  assert.ok(source.includes('Follow creator'));
  assert.ok(source.includes('Watch LIVE'));
  assert.ok(source.includes('followRequestRef.current'));
  assert.ok(source.includes("backendFetch('/live/following')"));
  assert.ok(source.includes('followCheckLoading'));
  assert.ok(source.includes('followGenerationRef.current'));
  assert.ok(source.includes("supabase.auth.onAuthStateChange"));
  assert.ok(source.includes('authRevision'));
});

test('LIVE Hub links followed creators and live stream cards to the public profile', () => {
  assert.ok(hub.includes("navigation.navigate('LiveCreatorProfile'"));
  assert.ok(hub.includes('openCreatorProfile(creator)'));
  assert.ok(hub.includes('openCreatorProfile(item, item.id, item.is_creator)'));
  assert.ok(hub.includes('currentLiveStreamId,'));
});
