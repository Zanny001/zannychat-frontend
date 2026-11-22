import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const leaderboard = fs.readFileSync(new URL('./LiveLeaderboardScreen.js', import.meta.url), 'utf8');
const hub = fs.readFileSync(new URL('./LiveHubScreen.js', import.meta.url), 'utf8');
const navigator = fs.readFileSync(new URL('../navigation/AppNavigator.js', import.meta.url), 'utf8');
const premiumHeader = fs.readFileSync(new URL('../components/LivePremiumHeader.js', import.meta.url), 'utf8');

test('LIVE leaderboard reads authenticated all-time ranking and follows account changes safely', () => {
  assert.ok(leaderboard.includes("backendFetch('/live/leaderboard?period=all_time&limit=50')"));
  assert.ok(leaderboard.includes('getCurrentUser()'));
  assert.ok(leaderboard.includes('supabase.auth.onAuthStateChange'));
  assert.ok(leaderboard.includes('refreshRequestRef.current += 1'));
  assert.ok(leaderboard.includes('latestUser?.id !== expectedUserId'));
});

test('LIVE leaderboard loads follow state and opens the privacy-aware creator profile', () => {
  assert.ok(leaderboard.includes("backendFetch('/live/following')"));
  assert.ok(leaderboard.includes('followingIds.includes(entry.creatorId)'));
  assert.ok(leaderboard.includes("navigation.navigate('LiveCreatorProfile'"));
  assert.ok(leaderboard.includes('isCurrentUser: entry.creatorId === currentUserId'));
});

test('LIVE leaderboard explains public-only privacy and unsupported time windows', () => {
  assert.ok(leaderboard.includes('Only profiles visible to everyone are ranked.'));
  assert.ok(leaderboard.includes('Private, contacts-only and blocked creators are excluded.'));
  assert.ok(leaderboard.includes('weekly and monthly score history is not yet available'));
  assert.ok(leaderboard.includes('The leaderboard is waiting for creators'));
});

test('LIVE leaderboard is reachable from LIVE Hub and every action has an accessible name', () => {
  assert.ok(hub.includes("navigation.navigate('LiveLeaderboard')"));
  assert.ok(navigator.includes('name="LiveLeaderboard" component={LiveLeaderboardRoute}'));
  assert.ok(navigator.includes("import LiveLeaderboardScreen from '../screens/LiveLeaderboardScreen'"));
  const controlLines = leaderboard.split('\n').filter((line) => line.includes('<TouchableOpacity'));
  assert.ok(controlLines.length >= 1, 'leaderboard retains its follow action');
  assert.ok(controlLines.every((line) => line.includes('accessibilityRole=') && line.includes('accessibilityLabel=')));
  assert.ok(leaderboard.includes('<LivePremiumHeader'));
  assert.ok(premiumHeader.includes('accessibilityLabel={backLabel}'));
  assert.ok(premiumHeader.includes('accessibilityLabel={refreshLabel}'));
});

test('LIVE leaderboard supports local creator-name search without changing published ranks', () => {
  assert.ok(leaderboard.includes("const [searchQuery, setSearchQuery] = useState('')"));
  assert.ok(leaderboard.includes('Search LIVE creators by name'));
  assert.ok(leaderboard.includes('const visibleEntries = useMemo'));
  assert.ok(leaderboard.includes("entries.filter((entry) => String(entry.name || '').toLowerCase().includes(query))"));
  assert.ok(leaderboard.includes('data={visibleEntries}'));
  assert.ok(leaderboard.includes('renderItem={({ item: entry }) =>'));
  assert.ok(leaderboard.includes('{entry.rank}'));
  assert.ok(leaderboard.includes('No creator matches that name'));
  assert.ok(leaderboard.includes('Clear creator search'));
});

test('LIVE leaderboard search stays local to the authenticated public ranking response', () => {
  assert.ok(leaderboard.includes("backendFetch('/live/leaderboard?period=all_time&limit=50')"));
  assert.ok(leaderboard.includes('Only profiles visible to everyone are ranked.'));
  assert.ok(leaderboard.includes('Private, contacts-only and blocked creators are excluded.'));
  assert.ok(!leaderboard.includes('backendFetch(`/live/leaderboard?'));
});

test('LIVE leaderboard virtualizes creator rows while retaining refresh, header and privacy context', () => {
  assert.ok(leaderboard.includes('<FlatList'));
  assert.ok(leaderboard.includes('keyExtractor={(entry) => String(entry.creatorId)}'));
  assert.ok(leaderboard.includes('initialNumToRender={12}'));
  assert.ok(leaderboard.includes('maxToRenderPerBatch={12}'));
  assert.ok(leaderboard.includes('windowSize={7}'));
  assert.ok(leaderboard.includes('ListHeaderComponent='));
  assert.ok(leaderboard.includes('ListFooterComponent='));
  assert.ok(leaderboard.includes('refreshControl={<RefreshControl'));
  assert.equal(leaderboard.includes('<ScrollView'), false);
});
