import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const analytics = fs.readFileSync(new URL('./LiveAnalyticsScreen.js', import.meta.url), 'utf8');
const studio = fs.readFileSync(new URL('./LiveCreatorStudioScreen.js', import.meta.url), 'utf8');
const navigator = fs.readFileSync(new URL('../navigation/AppNavigator.js', import.meta.url), 'utf8');

test('Creator Analytics uses the authenticated creator summary API and invalidates stale account requests', () => {
  assert.ok(analytics.includes("backendFetch('/live/creators/me/profile')"));
  assert.ok(analytics.includes('getCurrentUser()'));
  assert.ok(analytics.includes('supabase.auth.onAuthStateChange'));
  assert.ok(analytics.includes('refreshRequestRef.current += 1'));
  assert.ok(analytics.includes('latestUser?.id !== expectedUserId'));
  assert.ok(analytics.includes('onRefresh={() => refresh(true)}'));
});

test('Creator Analytics presents service-backed impact, audience, broadcast and replay metrics', () => {
  for (const label of ['Impact score', 'Total reactions', 'Unique supporters', 'Current followers', 'Total broadcasts', 'Live now', 'Total replays', 'Ready replays', 'Replays processing']) {
    assert.ok(analytics.includes(label), 'Missing analytics metric: ' + label);
  }
  assert.ok(analytics.includes('Latest 100 records'));
  assert.ok(analytics.includes('recentStreams.slice(0, 20)'));
  assert.ok(analytics.includes('recentReplays.slice(0, 20)'));
});

test('Creator Analytics does not fabricate time-series values that the current API does not provide', () => {
  assert.ok(analytics.includes('Daily trend charts'));
  assert.ok(analytics.includes('no estimated values are shown'));
  assert.ok(analytics.includes('not available from the current analytics API'));
});

test('Creator Studio links to the dedicated analytics route and the route is registered', () => {
  assert.ok(studio.includes("navigation.navigate('LiveAnalytics')"));
  assert.ok(navigator.includes('name="LiveAnalytics" component={LiveAnalyticsScreen}'));
  assert.ok(navigator.includes("import LiveAnalyticsScreen from '../screens/LiveAnalyticsScreen'"));
});
