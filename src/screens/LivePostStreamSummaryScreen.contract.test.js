import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const summary = fs.readFileSync(new URL('./LivePostStreamSummaryScreen.js', import.meta.url), 'utf8');
const stage = fs.readFileSync(new URL('./LiveStreamScreen.js', import.meta.url), 'utf8');
const webStage = fs.readFileSync(new URL('./LiveStreamScreen.web.js', import.meta.url), 'utf8');
const navigator = fs.readFileSync(new URL('../navigation/AppNavigator.js', import.meta.url), 'utf8');

test('Creator post-LIVE summary is account-bound and redirects after account changes', () => {
  assert.ok(summary.includes('getCurrentUser()'));
  assert.ok(summary.includes('supabase.auth.onAuthStateChange'));
  assert.ok(summary.includes("navigation.replace('LiveHub')"));
  assert.ok(summary.includes('session?.user?.id !== creatorId'));
});

test('Creator end flow fetches confirmed session timing and replay state before showing summary', () => {
  assert.ok(stage.includes("navigation.replace('LivePostStreamSummary'"));
  assert.ok(stage.includes("backendFetch('/live/creators/me/profile')"));
  assert.ok(stage.includes("backendFetch('/live/' + stream.id + '/replays')"));
  assert.ok(stage.includes('endedStream?.ended_at'));
  assert.ok(stage.includes('finalReplay?.status'));
  assert.ok(stage.includes('confirmedUser?.id !== ownerId'));
  assert.ok(webStage.includes("navigation.replace('LivePostStreamSummary'"));
  assert.ok(webStage.includes("backendFetch('/live/creators/me/profile')"));
  assert.ok(webStage.includes("backendFetch('/live/' + stream.id + '/replays')"));
  assert.ok(webStage.includes('confirmedUser?.id !== ownerId'));
});

test('Post-LIVE summary reports duration and recording status without inventing reach or earnings', () => {
  assert.ok(summary.includes('formatDuration(startedAt, endedAt)'));
  assert.ok(summary.includes('replayMessage(replayStatus, replayEnabled)'));
  assert.ok(summary.includes('Viewer reach, watch time and earnings are not displayed'));
  assert.ok(summary.includes('Open replay library'));
  assert.ok(summary.includes('Your LIVE has ended'));
});

test('Post-LIVE summary route is registered and all navigation actions are accessible', () => {
  assert.ok(navigator.includes('name="LivePostStreamSummary" component={LivePostStreamSummaryScreen}'));
  assert.ok(navigator.includes("import LivePostStreamSummaryScreen from '../screens/LivePostStreamSummaryScreen'"));
  const controlCount = (summary.match(/<TouchableOpacity/g) || []).length;
  const roleCount = (summary.match(/accessibilityRole=/g) || []).length;
  const labelCount = (summary.match(/accessibilityLabel=/g) || []).length;
  assert.ok(controlCount >= 3);
  assert.equal(roleCount, controlCount);
  assert.equal(labelCount, controlCount);
});
