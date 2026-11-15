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
  const rowEnd = screen.indexOf('</View>', rowStart);
  const row = screen.slice(rowStart, screen.indexOf('</View>\n              </View>', rowStart) + '</View>'.length);
  assert.ok(rowStart >= 0, 'contact row wrapper must exist');
  assert.ok(row.includes('style={styles.contactMain}'));
  assert.ok(row.includes('style={styles.favoriteButton}'));
  assert.ok(row.indexOf('</TouchableOpacity>') < row.indexOf('style={styles.favoriteButton}'));
  assert.match(row, /accessibilityLabel=\{favoriteIds\.includes\(item\.id\)/);
  assert.ok(rowEnd > rowStart);
});

test('New Chat favorite control remains independently accessible and has a 44-point target', () => {
  assert.match(screen, /favoriteButton: \{ minWidth: 44, minHeight: 44/);
  assert.match(screen, /accessibilityState=\{\{ selected: favoriteIds\.includes\(item\.id\), disabled: isBusy \}\}/);
});
