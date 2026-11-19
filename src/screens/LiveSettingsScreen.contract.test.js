import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./LiveSettingsScreen.js', import.meta.url), 'utf8');
const service = fs.readFileSync(new URL('../services/livePreferences.js', import.meta.url), 'utf8');
const hub = fs.readFileSync(new URL('./LiveHubScreen.js', import.meta.url), 'utf8');
const navigator = fs.readFileSync(new URL('../navigation/AppNavigator.js', import.meta.url), 'utf8');

test('LIVE defaults are loaded and saved through the authenticated backend service', () => {
  assert.ok(service.includes("from './backendClient'"));
  assert.ok(service.includes("backendFetch('/live/creators/me/preferences')"));
  assert.ok(service.includes("method: 'PUT'"));
  assert.ok(service.includes('const payload = {'));
  assert.ok(service.includes('allowGuests: normalized.allowGuests'));
  assert.ok(service.includes('body: JSON.stringify(payload)'));
  assert.ok(service.includes('updatedAt is server-owned metadata'));
  assert.ok(service.includes('assertAccount(userId)'));
  assert.ok(service.includes('LIVE settings require a connection to the ZannyChat service.'));
  assert.ok(service.includes('normalizeLivePreferences'));
  assert.ok(service.includes("['broadcast', 'video_chat', 'audio_room']"));
  assert.ok(service.includes("['public', 'followers', 'private']"));
  assert.ok(service.includes('LIVE_PREFERENCE_CATEGORIES.includes(source.category)'));
  assert.ok(service.includes('typeof source.allowGuests === \'boolean\''));
});

test('LIVE settings clearly distinguish account-synced defaults from active stream controls', () => {
  assert.ok(screen.includes('saved securely to your ZannyChat account'));
  assert.ok(screen.includes("saved ? 'Saved to your ZannyChat account' : 'Save LIVE defaults'"));
  assert.ok(screen.includes('They never change a LIVE that is already running.'));
  assert.ok(screen.includes('five-guest limit and server permissions still apply.'));
  assert.ok(screen.includes('You will still need to select at least one chat contact'));
});

test('LIVE settings load and save are guarded against account switching', () => {
  assert.ok(screen.includes('const latestUser = await getCurrentUser()'));
  assert.ok(screen.includes('latestUser?.id !== user.id'));
  assert.ok(screen.includes('confirmedUser?.id !== userId'));
  assert.ok(screen.includes('supabase.auth.onAuthStateChange'));
  assert.ok(screen.includes('loadRequestRef.current += 1'));
  assert.ok(screen.includes('requestId !== loadRequestRef.current'));
  assert.ok(screen.includes('setPreferences({ ...DEFAULT_LIVE_PREFERENCES })'));
  assert.ok(screen.includes('data?.subscription?.unsubscribe?.()'));
  assert.ok(screen.includes('saveLivePreferences(userId, preferences)'));
});

test('LIVE settings has accessible format, audience, category and guest-default controls', () => {
  assert.ok(screen.includes('accessibilityRole="radio"'));
  assert.ok(screen.includes('accessibilityState={{ checked: selected }}'));
  assert.ok(screen.includes('accessibilityLabel="Allow approved guests by default"'));
  assert.ok(screen.includes('accessibilityLabel="Save LIVE settings"'));
  assert.ok(screen.includes('minHeight: 52'));
  assert.ok(screen.includes("navigation.navigate(item.route)"));
  assert.ok(screen.includes("route: 'PrivacySecurity'"));
  assert.ok(screen.includes("route: 'Notifications'"));
  assert.ok(screen.includes("route: 'Sessions'"));
});

test('LIVE Hub and navigation expose the dedicated settings experience', () => {
  assert.ok(hub.includes("navigation.navigate('LiveSettings')"));
  assert.ok(navigator.includes('name="LiveSettings" component={LiveSettingsScreen}'));
  assert.ok(navigator.includes("import LiveSettingsScreen from '../screens/LiveSettingsScreen'"));
});

test('LIVE Hub applies saved creator defaults to the next broadcast setup only', () => {
  assert.ok(hub.includes('loadLivePreferences(expectedUserId)') && hub.includes('applyLivePreferences(currentUserId)'));
  assert.ok(hub.includes('setExperienceMode(preferences.experienceMode)'));
  assert.ok(hub.includes('setVisibility(preferences.visibility)'));
  assert.ok(hub.includes('setCategory(preferences.category)'));
  assert.ok(hub.includes('setAllowGuests(preferences.allowGuests)'));
  assert.equal(hub.includes("if (mode.value !== 'broadcast') setAllowGuests(true)"), false);
});
