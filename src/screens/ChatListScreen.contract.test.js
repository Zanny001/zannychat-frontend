import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./ChatListScreen.js', import.meta.url), 'utf8');

test('inbox filter chips keep a 48-point minimum touch height with centered labels', () => {
  assert.match(screen, /filterPill: \{ minHeight: 48/);
  assert.match(screen, /filterPill: \{[^}]*alignItems: 'center'[^}]*justifyContent: 'center'/);
});

test('inbox filters expose the selected state to assistive technology', () => {
  assert.ok(screen.includes('accessibilityRole="button"'));
  assert.ok(screen.includes('accessibilityState={{ selected: active }}'));
  assert.ok(screen.includes('accessibilityLabel={`${filter.label} filter`}'));
});

test('Chats header actions and search field keep moderate accessible dimensions', () => {
  assert.match(screen, /cameraBtn: \{ width: 48, height: 48, minWidth: 48, minHeight: 48/);
  assert.match(screen, /draftsBtn: \{ width: 48, height: 48, minWidth: 48, minHeight: 48/);
  assert.match(screen, /newChatBtn: \{ width: 48, height: 48, minWidth: 48, minHeight: 48/);
  assert.match(screen, /searchBar: \{ minHeight: 48/);
  assert.match(screen, /accessibilityLabel="See all moments" style=\{\{ minHeight: 48/);
});


test('inbox refreshes while focused from realtime message and participant changes', () => {
  assert.ok(screen.includes('subscribeToConversationListChanges'));
  assert.ok(screen.includes('useFocusEffect(useCallback(() => {'));
  assert.ok(screen.includes('setTimeout(() => {'));
  assert.ok(screen.includes('load().catch(() => {})'));
  assert.ok(screen.includes('unsubscribe()'));
  assert.ok(screen.includes('loadRequestRef.current'));
  assert.ok(screen.includes('AppState.addEventListener(\'change\''));
  assert.ok(screen.includes('state === \'active\' && active'));
  assert.ok(screen.includes('AppState.currentState && AppState.currentState !== \'active\''));
});


test('chat story tray reads status seen markers from the current account only', () => {
  assert.ok(screen.includes('readSeenStatusIds(AsyncStorage, user?.id)'));
});
