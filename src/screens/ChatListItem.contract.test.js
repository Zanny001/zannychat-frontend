import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const component = fs.readFileSync(new URL('../components/ChatListItem.js', import.meta.url), 'utf8');

test('inbox conversations use a compact accessible row instead of nested glass cards', () => {
  assert.ok(component.includes('Pressable'));
  assert.equal(component.includes('GlassCard'), false);
  assert.equal(component.includes('TouchableOpacity'), false);
  assert.ok(component.includes('accessibilityRole="button"'));
  assert.ok(component.includes('accessibilityLabel='));
  assert.ok(component.includes('accessibilityHint='));
});

test('inbox rows preserve conversation actions, presence and unread state', () => {
  assert.ok(component.includes('onLongPress={onLongPressActions}'));
  assert.ok(component.includes('online={isGroup ? undefined : participant.online}'));
  assert.ok(component.includes('unreadCount > 0'));
  assert.ok(component.includes('isFavorite'));
  assert.ok(component.includes('isMuted'));
});

test('inbox rows avoid implying encryption with decorative lock or globe glyphs', () => {
  assert.equal(component.includes('lock-closed-outline'), false);
  assert.equal(component.includes('globe-outline'), false);
});
