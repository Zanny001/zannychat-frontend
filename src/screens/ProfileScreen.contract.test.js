import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const profile = fs.readFileSync(new URL('./ProfileScreen.js', import.meta.url), 'utf8');

test('profile refresh is focus-aware and ignores stale async responses', () => {
  assert.ok(profile.includes('useFocusEffect'));
  assert.ok(profile.includes('let active = true'));
  assert.ok(profile.includes('if (active) setUser(profile || null)'));
  assert.ok(profile.includes('return () => { active = false; }'));
  assert.equal(profile.includes('getCurrentUser().then(setUser)'), false);
});

test('profile failures have a clear retry path and loading feedback', () => {
  assert.ok(profile.includes('profileError'));
  assert.ok(profile.includes('ActivityIndicator'));
  assert.ok(profile.includes('Retry loading your profile'));
  assert.ok(profile.includes('setReloadKey((value) => value + 1)'));
});

test('profile actions use accessible Pressable controls', () => {
  assert.ok(profile.includes('Pressable'));
  assert.equal(profile.includes('TouchableOpacity'), false);
  assert.ok(profile.includes('accessibilityHint={`Opens ${label.toLowerCase()}`}'));
  assert.ok(profile.includes('minHeight: 44'));
});
