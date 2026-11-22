import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const profile = fs.readFileSync(new URL('./ProfileScreen.js', import.meta.url), 'utf8');

test('profile refresh is focus-aware and ignores stale async responses', () => {
  assert.ok(profile.includes('useFocusEffect'));
  assert.ok(profile.includes('let active = true'));
  assert.ok(profile.includes('if (!active) return'));
  assert.ok(profile.includes('return () => { active = false; }'));
  assert.equal(profile.includes('getCurrentUser().then(setUser)'), false);
});

test('profile failures have a clear retry path and loading feedback', () => {
  assert.ok(profile.includes('profileError'));
  assert.ok(profile.includes('ActivityIndicator'));
  assert.ok(profile.includes('Retry loading your profile'));
  assert.ok(profile.includes('setReloadKey((value) => value + 1)'));
});

test('profile actions use accessible Pressable controls with 48pt targets', () => {
  assert.ok(profile.includes('Pressable'));
  assert.equal(profile.includes('TouchableOpacity'), false);
  assert.ok(profile.includes('accessibilityHint='));
  assert.ok(profile.includes('minHeight: 48'));
});


test('profile refresh clears previous account data before loading and on failure', () => {
  assert.ok(profile.includes('setUser(null)'));
  assert.ok(profile.includes('setLiveImpact(null)'));
  assert.ok(profile.includes('// Do not keep another account'));
});

test('profile navigation is grouped into clear personal, community and support destinations', () => {
  assert.ok(profile.includes('YOUR IDENTITY'));
  assert.ok(profile.includes('YOUR CONTENT & COMMUNITY'));
  assert.ok(profile.includes('SUPPORT & STORAGE'));
  assert.ok(profile.includes('minHeight: 72'));
});


test('profile navigation rows use premium icon wells, descriptive hierarchy and comfortable targets', () => {
  assert.ok(profile.includes('description="Colours, motion and comfortable reading"'));
  assert.ok(profile.includes('description="Your private library of important moments"'));
  assert.ok(profile.includes('styles.menuIconWell'));
  assert.ok(profile.includes('styles.menuChevron'));
  assert.ok(profile.includes('menuIconWell: { width: 42, height: 42'));
  assert.ok(profile.includes('row: { flexDirection: \'row\', alignItems: \'center\', minHeight: 72'));
  assert.ok(profile.includes('accessibilityHint={description ||'));
});

test('profile hub supports local search across destination names and descriptions', () => {
  assert.ok(profile.includes('Search profile settings and destinations'));
  assert.ok(profile.includes('const matchesMenuItem ='));
  assert.ok(profile.includes('const hasProfileMatches ='));
  assert.ok(profile.includes('matchesMenuItem(label, description)'));
  assert.ok(profile.includes('No profile destinations found'));
  assert.ok(profile.includes('Clear profile search'));
  assert.ok(profile.includes('profileSearch.trim()'));
});

test('profile search keeps destination routes and grouped headings intact for matching descriptions', () => {
  for (const route of ['Settings', 'PrivacySecurity', 'Notifications', 'StatusUpdates', 'Channels', 'SavedMessages', 'ScheduledMessages', 'ChatFolders', 'JoinGroup', 'DataStorage', 'Help']) {
    assert.ok(profile.includes("navigation.navigate('" + route + "')"), route);
  }
  assert.ok(profile.includes('PERSONALIZE & PROTECT'));
  assert.ok(profile.includes('YOUR CONTENT & COMMUNITY'));
  assert.ok(profile.includes('SUPPORT & STORAGE'));
});
