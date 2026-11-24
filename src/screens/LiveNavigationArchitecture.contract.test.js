import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const navigator = fs.readFileSync(new URL('../navigation/AppNavigator.js', import.meta.url), 'utf8');
const stream = fs.readFileSync(new URL('./LiveStreamScreen.js', import.meta.url), 'utf8');
const webStream = fs.readFileSync(new URL('./LiveStreamScreen.web.js', import.meta.url), 'utf8');
const summary = fs.readFileSync(new URL('./LivePostStreamSummaryScreen.js', import.meta.url), 'utf8');

test('LIVE has one canonical Hub entry and no duplicate root-stack Hub route', () => {
  assert.equal((navigator.match(/MainTabs\.Screen name="LIVE" component={LiveHubRoute}/g) || []).length, 1);
  assert.equal((navigator.match(/RootStack\.Screen name="LiveHub"/g) || []).length, 0);
  assert.match(navigator, /LIVE EXPERIENCE: one canonical Hub entry in MainTabs/);
});

test('all supporting LIVE routes are grouped together without changing their route names', () => {
  const groupStart = navigator.indexOf('LIVE EXPERIENCE: one canonical Hub entry');
  const groupEnd = navigator.indexOf('</RootStack.Group>', groupStart);
  assert.ok(groupStart > 0 && groupEnd > groupStart);
  const group = navigator.slice(groupStart, groupEnd);
  const expected = [
    'LivePreflight','LiveStream','LiveReplay','LiveCreatorStudio','LiveCreatorProfile',
    'LiveReplayLibrary','LiveGuestQueue','LiveModeration','LiveReports','LiveAnalytics',
    'LivePostStreamSummary','LiveLeaderboard','LiveSettings','LiveEvents','LiveWallet','LiveCreatorEarnings','LiveCreatorPayout','LivePayoutReview','LiveRewardPolicyAdmin',
  ];
  for (const route of expected) assert.ok(group.includes(`name="${route}"`), `Missing grouped route: ${route}`);
  assert.equal((group.match(/<RootStack\.Screen name=/g) || []).length, expected.length);
});

test('LIVE creator identity reuses the shared profile implementation', () => {
  assert.match(navigator, /name="LiveCreatorProfile" component={LiveCreatorProfileRoute}/);
});

test('broadcast exits and post-LIVE return paths target the canonical LIVE tab', () => {
  for (const source of [stream, webStream, summary]) {
    assert.ok(source.includes("navigation.replace('Main', { screen: 'LIVE' })"));
    assert.equal(source.includes("navigation.replace('LiveHub')"), false);
  }
});

test('LIVE navigation groups preserve the six primary destinations', () => {
  for (const tab of ['Chats','Calls','LIVE','Updates','Channels','Profile']) {
    assert.ok(navigator.includes(`<MainTabs.Screen name="${tab}"`), `Missing primary tab: ${tab}`);
  }
});

test('LIVE destinations are reachable through their owning user journeys', () => {
  const read = (name) => fs.readFileSync(new URL(`./${name}`, import.meta.url), 'utf8');
  const routes = {
    hub: read('LiveHubScreen.js'),
    preflight: read('LivePreflightScreen.js'),
    stream: read('LiveStreamScreen.js'),
    studio: read('LiveCreatorStudioScreen.js'),
    events: read('LiveEventsScreen.js'),
    replayLibrary: read('LiveReplayLibraryScreen.js'),
    leaderboard: read('LiveLeaderboardScreen.js'),
    summary: read('LivePostStreamSummaryScreen.js'),
    guestQueue: read('LiveGuestQueueScreen.js'),
    moderation: read('LiveModerationScreen.js'),
    reports: read('LiveReportsScreen.js'),
  };
  const edges = [
    ['hub', 'LivePreflight'], ['hub', 'LiveCreatorStudio'], ['hub', 'LiveLeaderboard'],
    ['hub', 'LiveEvents'], ['hub', 'LiveSettings'], ['hub', 'LiveReplayLibrary'],
    ['hub', 'LiveCreatorProfile'], ['hub', 'LiveStream'],
    ['preflight', 'LiveStream'],
    ['stream', 'LiveGuestQueue'], ['stream', 'LiveModeration'], ['stream', 'LiveReports'],
    ['stream', 'LiveCreatorProfile'], ['stream', 'LiveReplay'], ['stream', 'LivePostStreamSummary'],
    ['studio', 'LiveAnalytics'], ['studio', 'LiveModeration'], ['studio', 'LiveReplayLibrary'], ['studio', 'LiveReplay'],
    ['events', 'LivePreflight'], ['replayLibrary', 'LiveReplay'],
    ['leaderboard', 'LiveCreatorProfile'],
    ['summary', 'LiveReplayLibrary'], ['summary', 'LiveCreatorStudio'],
    ['guestQueue', 'LiveModeration'], ['moderation', 'LiveGuestQueue'], ['moderation', 'LiveReports'],
    ['reports', 'LiveModeration'],
  ];
  for (const [owner, destination] of edges) {
    assert.ok(routes[owner].includes(`navigate('${destination}'`) || routes[owner].includes(`replace('${destination}'`),
      `Expected ${owner} to provide a route to ${destination}`);
  }
});
