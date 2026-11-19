import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./NewChatScreen.js', import.meta.url), 'utf8');

test('New Chat contact rows use a calm, moderate list treatment rather than a card per contact', () => {
  assert.match(screen, /contactRow: \{ minHeight: 76/);
  assert.match(screen, /contactMain: \{ flex: 1, minWidth: 0, minHeight: 52/);
  assert.match(screen, /borderBottomWidth: StyleSheet\.hairlineWidth/);
  assert.doesNotMatch(screen, /<GlassCard[\s\S]{0,120}contentStyle=\{styles\.row\}/);
});

test('New Chat favorite action is a sibling of the open-chat action, never nested inside it', () => {
  const rowStart = screen.indexOf('<View style={[styles.contactRow');
  const mainOpen = screen.indexOf('<TouchableOpacity', rowStart);
  const mainClose = screen.indexOf('</TouchableOpacity>', mainOpen);
  const favoriteOpen = screen.indexOf('<TouchableOpacity', mainClose + 1);
  const favoriteIndex = screen.indexOf('style={styles.favoriteButton}', mainClose + 1);
  const rowEnd = screen.indexOf('\n              </View>', favoriteIndex);
  assert.ok(rowStart >= 0, 'contact row wrapper must exist');
  assert.ok(mainOpen > rowStart && mainClose > mainOpen, 'main contact action must be a complete sibling control');
  assert.ok(favoriteOpen > mainClose && favoriteIndex > mainClose, 'favorite action must start after the open-chat action closes');
  const row = screen.slice(rowStart, rowEnd);
  assert.match(row, /accessibilityLabel=\{favoriteIds\.includes\(item\.id\)/);
  assert.ok(rowEnd > favoriteIndex, 'both controls must remain inside the same row');
});

test('New Chat favorite control remains independently accessible and has a 48-point target', () => {
  assert.match(screen, /favoriteButton: \{ minWidth: 48, minHeight: 48/);
  assert.match(screen, /accessibilityState=\{\{ selected: favoriteIds\.includes\(item\.id\), disabled: isBusy \}\}/);
});

test('New Chat quick actions wrap cleanly instead of overflowing narrow phones', () => {
  assert.match(screen, /flexDirection: 'row', flexWrap: 'wrap', gap: spacing\.sm/);
  assert.match(screen, /quickAction: \{ flexGrow: 1, flexBasis: 128, minWidth: 128 \}/);
  assert.match(screen, /qrRow: \{[\s\S]*?minHeight: 48,[\s\S]*?\}/);
});


test('New Chat clears account-owned contacts and favorites when auth changes', () => {
  assert.ok(screen.includes("import { supabase, SUPABASE_ENABLED } from '../services/supabaseClient'"));
  assert.ok(screen.includes('const activeUserIdRef = useRef(undefined)'));
  assert.ok(screen.includes('const accountChangedRef = useRef(false)'));
  assert.ok(screen.includes('if (accountChangedRef.current || loadingContacts || !targetUserId'));
  assert.ok(screen.includes('supabase.auth.onAuthStateChange'));
  assert.ok(screen.includes('setContacts([])'));
  assert.ok(screen.includes('setFavoriteIds([])'));
  assert.ok(screen.includes('setDiscoveredContacts([])'));
  assert.ok(screen.includes('setFavoriteStorageKey(key)'));
  assert.ok(screen.includes('activeUserIdRef.current !== userId'));
  assert.ok(screen.includes('data?.subscription?.unsubscribe?.()'));
});

test('New Chat favorite writes stay bound to the account whose directory is visible', () => {
  assert.ok(screen.includes('const expectedUserId = activeUserIdRef.current'));
  assert.ok(screen.includes('const expectedStorageKey = favoriteStorageKey'));
  assert.ok(screen.includes('activeUserIdRef.current !== expectedUserId'));
});


test('New Chat contact directory uses a bounded virtualized render window', () => {
  assert.match(screen, /<FlatList[^>]*keyboardShouldPersistTaps="handled"/);
  assert.match(screen, /initialNumToRender=\{12\}/);
  assert.match(screen, /maxToRenderPerBatch=\{12\}/);
  assert.match(screen, /updateCellsBatchingPeriod=\{50\}/);
  assert.match(screen, /windowSize=\{7\}/);
});
