import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const callsScreen = fs.readFileSync(new URL('./CallHistoryScreen.js', import.meta.url), 'utf8');
const newChatScreen = fs.readFileSync(new URL('./NewChatScreen.js', import.meta.url), 'utf8');

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
