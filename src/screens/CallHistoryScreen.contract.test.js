import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const callsScreen = fs.readFileSync(new URL('./CallHistoryScreen.js', import.meta.url), 'utf8');
const newChatScreen = fs.readFileSync(new URL('./NewChatScreen.js', import.meta.url), 'utf8');
const callsService = fs.readFileSync(new URL('../services/calls.js', import.meta.url), 'utf8');

test('Calls screen exposes audio, video, and favourites quick actions', () => {
  assert.ok(callsScreen.includes("navigation.navigate('NewChat', { callType: 'audio', directoryFilter: 'all' })"));
  assert.ok(callsScreen.includes("navigation.navigate('NewChat', { callType: 'video', directoryFilter: 'all' })"));
  assert.ok(callsScreen.includes("navigation.navigate('NewChat', { directoryFilter: 'favorites', callType: null })"));
});

test('quick actions have accessible labels and button roles', () => {
  assert.ok(callsScreen.includes("accessibilityLabel={item.title === 'Favourites' ? 'Open favourite contacts'"));
  assert.ok(callsScreen.includes('accessibilityRole="button"'));
});

test('contact selection starts the requested audio or video call', () => {
  assert.ok(newChatScreen.includes("requestedCallType === 'audio' || requestedCallType === 'video'"));
  assert.ok(newChatScreen.includes('conversationId: conversation.id'));
  assert.ok(newChatScreen.includes('calleeId: contact.id'));
  assert.ok(newChatScreen.includes('callType: requestedCallType'));
  assert.ok(newChatScreen.includes("navigation.navigate('OutgoingCall'"));
});

test('directory filter follows navigation parameters when the screen is reused', () => {
  assert.ok(newChatScreen.includes("['all', 'online', 'favorites'].includes(route?.params?.directoryFilter)"));
  assert.ok(newChatScreen.includes('useState(initialDirectoryFilter)'));
  assert.ok(newChatScreen.includes('setDirectoryFilter(requestedFilter)'));
  assert.ok(newChatScreen.includes('setOnlineOnly(false)'));
  assert.ok(newChatScreen.includes('[route?.params?.directoryFilter]'));
});

test('quick actions clear stale call and filter parameters', () => {
  assert.ok(callsScreen.includes("callType: 'audio', directoryFilter: 'all'"));
  assert.ok(callsScreen.includes("callType: 'video', directoryFilter: 'all'"));
  assert.ok(callsScreen.includes("directoryFilter: 'favorites', callType: null"));
});


test('upgraded one-to-one calls appear only once as conference history', () => {
  assert.ok(callsService.includes('expires_at,group_room_id'));
  assert.ok(callsService.includes('rows.filter((row) => !row.group_room_id).map((row) => {'));
});

test('call history uses a virtualized list with stable direct and group call keys', () => {
  assert.ok(callsScreen.includes('<FlatList'));
  assert.ok(callsScreen.includes('data={filteredCalls}'));
  assert.ok(callsScreen.includes('keyExtractor='));
  assert.ok(callsScreen.includes('renderItem='));
  assert.ok(!callsScreen.includes('calls.map('));
});

test('quick-connect cards use a more compact premium footprint', () => {
  assert.ok(callsScreen.includes('minHeight: 116'));
  assert.ok(callsScreen.includes('START IN A TAP'));
});

test('call history offers live filters for missed, direction and media type', () => {
  for (const value of ['all', 'missed', 'incoming', 'outgoing', 'video', 'audio']) {
    assert.ok(callsScreen.includes(`value: '${value}'`), value);
  }
  assert.ok(callsScreen.includes('const missedCount = calls.filter(isMissedCall).length'));
  assert.ok(callsScreen.includes('count: calls.length'));
  assert.ok(callsScreen.includes('count: missedCount'));
});

test('call history filters preserve safe expired-ringing missed-call detection and empty states', () => {
  assert.ok(callsScreen.includes("item.status === 'ringing' && Number.isFinite(Date.parse(item.expires_at)) && Date.parse(item.expires_at) <= Date.now()"));
  assert.ok(callsScreen.includes("item.direction === 'incoming'"));
  assert.ok(callsScreen.includes("item.direction === 'outgoing'"));
  assert.ok(callsScreen.includes("item.call_type === 'video'"));
  assert.ok(callsScreen.includes("calls.length > 0 ? 'No calls in this view'"));
});

test('call history filters are accessible selectable controls', () => {
  assert.ok(callsScreen.includes('accessibilityRole="radio"'));
  assert.ok(callsScreen.includes('accessibilityState={{ checked: selected }}'));
  assert.ok(callsScreen.includes('minHeight: 44'));
});

test('call history supports accessible contact-name search and a one-tap clear action', () => {
  assert.ok(callsScreen.includes('const [searchQuery, setSearchQuery] = useState(\'\')'));
  assert.ok(callsScreen.includes('Search call history by contact name'));
  assert.ok(callsScreen.includes('String(item.participantName || \'\').toLowerCase().includes(query)'));
  assert.ok(callsScreen.includes('accessibilityLabel="Clear call history search"'));
  assert.ok(callsScreen.includes('data={filteredCalls}'));
});

test('call history adds a dedicated group-call filter without changing direct call filters', () => {
  assert.ok(callsScreen.includes("if (historyFilter === 'group') return Boolean(item.isGroupCall)"));
  assert.ok(callsScreen.includes("{ value: 'group', label: 'Group' }"));
  assert.ok(callsScreen.includes("item.isGroupCall"));
  for (const value of ['all', 'missed', 'incoming', 'outgoing', 'video', 'audio']) {
    assert.ok(callsScreen.includes("value: '" + value + "'"), value);
  }
});


test('call history discards stale requests after the screen loses focus', () => {
  assert.ok(callsScreen.includes('const historyRequestIdRef = useRef(0)'));
  assert.ok(callsScreen.includes('const screenFocusedRef = useRef(false)'));
  assert.ok(callsScreen.includes('requestId === historyRequestIdRef.current'));
  assert.ok(callsScreen.includes('screenFocusedRef.current = false'));
  assert.ok(callsScreen.includes('historyRequestIdRef.current += 1'));
});

test('call history never publishes rows fetched for a previous signed-in account', () => {
  assert.ok(callsService.includes('if (await getCallUserId() !== userId) return []'));
});

test('direct redial refuses to navigate without a valid peer identity', () => {
  assert.ok(callsScreen.includes("showAppAlert('Contact unavailable'"));
  assert.ok(callsScreen.includes('if (!peerId)'));
});
