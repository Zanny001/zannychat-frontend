import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (name) => fs.readFileSync(new URL('./' + name, import.meta.url), 'utf8');
const guestQueue = read('LiveGuestQueueScreen.js');
const moderation = read('LiveModerationScreen.js');
const reports = read('LiveReportsScreen.js');
const navigator = fs.readFileSync(new URL('../navigation/AppNavigator.js', import.meta.url), 'utf8');
const studio = read('LiveCreatorStudioScreen.js');
const nativeStage = read('LiveStreamScreen.js');
const webStage = read('LiveStreamScreen.web.js');

test('LIVE guest queue uses creator-authorized backend requests and enforces the five-guest UI capacity', () => {
  assert.ok(guestQueue.includes("`/live/${streamId}/guest-requests`"));
  assert.ok(guestQueue.includes("method: 'PATCH'"));
  assert.ok(guestQueue.includes('body: JSON.stringify({ status })'));
  assert.ok(guestQueue.includes("status === 'accepted' && guestSlots <= 0"));
  assert.ok(guestQueue.includes('Math.max(0, 5 - guestCount)'));
  assert.ok(guestQueue.includes('guestSlots <= 0'));
  assert.ok(guestQueue.includes('onRefresh={() => refresh(true)}'));
  assert.ok(guestQueue.includes('Your queue is clear'));
});

test('LIVE participant moderation maps each action to its stream-scoped server endpoint', () => {
  assert.ok(moderation.includes("`/live/${streamId}/participants`"));
  assert.ok(moderation.includes("`/live/${streamId}/guests/${item.userId}/mute`"));
  assert.ok(moderation.includes("`/live/${streamId}/guests/${item.userId}/spotlight`"));
  assert.ok(moderation.includes("`/live/${streamId}/guests/${item.userId}`"));
  assert.ok(moderation.includes("`/live/${streamId}/participants/${item.userId}`"));
  assert.ok(moderation.includes("`/live/${streamId}/moderators`"));
  assert.ok(moderation.includes('confirmAction'));
  assert.ok(moderation.includes('This does not block their ZannyChat account.'));
  assert.ok(moderation.includes('can continue watching this LIVE as a viewer.'));
});

test('LIVE reports workspace supports the backend review lifecycle and accessible queue filters', () => {
  assert.ok(reports.includes("`/live/${streamId}/reports`"));
  assert.ok(reports.includes("`/live/${streamId}/reports/${reportId}`"));
  assert.ok(reports.includes("['resolved', 'dismissed']"));
  assert.ok(reports.includes("'reviewing'"));
  assert.ok(reports.includes("'dismissed'"));
  assert.ok(reports.includes("'resolved'"));
  assert.ok(reports.includes('accessibilityRole="radio"'));
  assert.ok(reports.includes('No reports in this view'));
  assert.ok(reports.includes('route.params?.canManageParticipants !== false'));
});

test('LIVE operations workspaces are registered and discoverable from Creator Studio and both room clients', () => {
  for (const route of ['LiveGuestQueue', 'LiveModeration', 'LiveReports']) {
    assert.ok(navigator.includes(`name="${route}"`));
  }
  assert.ok(studio.includes("navigation.navigate('LiveModeration'"));
  assert.ok(nativeStage.includes("navigation.navigate('LiveGuestQueue'"));
  assert.ok(nativeStage.includes("navigation.navigate('LiveModeration'"));
  assert.ok(nativeStage.includes("navigation.navigate('LiveReports'"));
  assert.ok(webStage.includes("navigation.navigate('LiveGuestQueue'"));
  assert.ok(webStage.includes("navigation.navigate('LiveModeration'"));
  assert.ok(webStage.includes("navigation.navigate('LiveReports'"));
});

test('LIVE operations screens provide 48-point controls, refresh, loading, error and empty states', () => {
  for (const source of [guestQueue, moderation, reports]) {
    assert.ok(source.includes('minHeight: 48'));
    assert.ok(source.includes('RefreshControl'));
    assert.ok(source.includes('ActivityIndicator'));
    assert.ok(source.includes('accessibilityRole="alert"'));
    assert.ok(source.includes('Try again'));
  }
});


test('LIVE operations recovery actions each meet the 48-point mobile target', () => {
  assert.ok(guestQueue.includes('accessibilityLabel="Retry loading guest queue" style={{ minHeight: 48'));
  assert.ok(moderation.includes('accessibilityLabel="Retry loading LIVE participants" style={{ minHeight: 48'));
  assert.ok(reports.includes('accessibilityLabel="Retry loading LIVE reports" style={{ minHeight: 48'));
  assert.ok(reports.includes('minHeight: 48, paddingHorizontal: spacing.md'));
});

test('LIVE participant moderation virtualizes large rosters without weakening role-based controls', () => {
  assert.ok(moderation.includes('<FlatList'));
  assert.ok(moderation.includes('data={visibleParticipants}'));
  assert.ok(moderation.includes('keyExtractor={(item) => String(item.userId)}'));
  assert.ok(moderation.includes('renderItem={({ item }) =>'));
  assert.ok(!moderation.includes('participants.map('));
  assert.ok(moderation.includes('ListHeaderComponent='));
  assert.ok(moderation.includes('ListEmptyComponent='));
  assert.ok(moderation.includes('refreshControl={<RefreshControl'));
  assert.ok(moderation.includes("const [participantFilter, setParticipantFilter] = useState('all')"));
  assert.ok(moderation.includes('data={visibleParticipants}'));
  assert.ok(moderation.includes("participantFilter === 'viewers'"));
  assert.ok(moderation.includes("participantFilter === 'guests'"));
  assert.ok(moderation.includes("participantFilter === 'moderators'"));
  assert.ok(moderation.includes("label: 'Stage guests'"));
  assert.ok(moderation.includes('No participants in this view'));
  assert.ok(moderation.includes("backendFetch(\u0060/live/\u0024{streamId}/guests/\u0024{item.userId}/mute\u0060"));
  assert.ok(moderation.includes('makeModerator ? ' + String.fromCharCode(96) + '/live/${streamId}/moderators' + String.fromCharCode(96)));
});

test('LIVE report queue exposes dismissed reports and accounts for every terminal status', () => {
  assert.ok(reports.includes("{ value: 'dismissed', label: 'Dismissed' }"));
  assert.ok(reports.includes("dismissed: reports.filter((item) => item.status === 'dismissed').length"));
  assert.ok(reports.includes("['Dismissed', counts.dismissed]"));
  assert.ok(reports.includes("const terminal = ['resolved', 'dismissed'].includes(item.status)"));
});

test('LIVE guest request queue virtualizes long lists while retaining stage context and recovery states', () => {
  assert.ok(guestQueue.includes('<FlatList'));
  assert.ok(guestQueue.includes('data={requests}'));
  assert.ok(guestQueue.includes('keyExtractor={(item) => String(item.user_id)}'));
  assert.ok(guestQueue.includes('renderItem={({ item }) =>'));
  assert.ok(!guestQueue.includes('requests.map('));
  assert.ok(guestQueue.includes('ListHeaderComponent='));
  assert.ok(guestQueue.includes('ListEmptyComponent='));
  assert.ok(guestQueue.includes('refreshControl={<RefreshControl'));
  assert.ok(guestQueue.includes('Math.max(0, 5 - guestCount)'));
});

test('LIVE safety report queue virtualizes report cards while preserving review controls and recovery states', () => {
  assert.ok(reports.includes('<FlatList'));
  assert.ok(reports.includes('data={visibleReports}'));
  assert.ok(reports.includes('keyExtractor={(item) => String(item.id)}'));
  assert.ok(reports.includes('renderItem={({ item }) =>'));
  assert.ok(!reports.includes('visibleReports.map('));
  assert.ok(reports.includes('ListHeaderComponent='));
  assert.ok(reports.includes('ListEmptyComponent='));
  assert.ok(reports.includes('refreshControl={<RefreshControl'));
  assert.ok(reports.includes("review(item.id, 'reviewing')"));
  assert.ok(reports.includes("review(item.id, 'dismissed')"));
  assert.ok(reports.includes("review(item.id, 'resolved')"));
});

test('LIVE guest queue supports local viewer-name search without changing the approval capacity', () => {
  assert.ok(guestQueue.includes("const [searchQuery, setSearchQuery] = useState('')"));
  assert.ok(guestQueue.includes('const visibleRequests = requests.filter'));
  assert.ok(guestQueue.includes('Search guest requests by viewer name'));
  assert.ok(guestQueue.includes('Clear guest request search'));
  assert.ok(guestQueue.includes('data={visibleRequests}'));
  assert.ok(guestQueue.includes('Math.max(0, 5 - guestCount)'));
  assert.ok(guestQueue.includes("status === 'accepted' && guestSlots <= 0"));
  assert.ok(guestQueue.includes('No matching requests'));
});

test('LIVE safety reports support local reason/detail search alongside status filters', () => {
  assert.ok(reports.includes("const [searchQuery, setSearchQuery] = useState('')"));
  assert.ok(reports.includes('const visibleReports = useMemo'));
  assert.ok(reports.includes("String(item.reason || '') + ' ' + String(item.details || '')"));
  assert.ok(reports.includes('Search LIVE reports by reason or details'));
  assert.ok(reports.includes('Clear LIVE report search'));
  assert.ok(reports.includes('No matching reports'));
  assert.ok(reports.includes('data={visibleReports}'));
});

test('LIVE participant moderation supports local name and role search alongside role filters', () => {
  assert.ok(moderation.includes("const [searchQuery, setSearchQuery] = useState('')"));
  assert.ok(moderation.includes('const visibleParticipants = useMemo'));
  assert.ok(moderation.includes("String(item.name || '') + ' ' + String(item.role || '')"));
  assert.ok(moderation.includes('Search LIVE participants by name or role'));
  assert.ok(moderation.includes('Clear participant search'));
  assert.ok(moderation.includes('No matching participants'));
  assert.ok(moderation.includes('data={visibleParticipants}'));
});

test('LIVE operations searches filter already-loaded queue data locally', () => {
  assert.ok(guestQueue.includes('const visibleRequests = requests.filter'));
  assert.ok(reports.includes('const visibleReports = useMemo'));
  assert.ok(moderation.includes('const visibleParticipants = useMemo'));
  assert.ok(guestQueue.includes('data={visibleRequests}'));
  assert.ok(reports.includes('data={visibleReports}'));
  assert.ok(moderation.includes('data={visibleParticipants}'));
});
