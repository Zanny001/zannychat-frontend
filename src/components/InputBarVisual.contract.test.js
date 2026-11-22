import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./InputBar.js', import.meta.url), 'utf8');

test('chat composer uses distinct accessible circular attachment and emoji controls', () => {
  assert.ok(source.includes('styles.utilityBtn'));
  assert.ok(source.includes('width: 48, height: 48, minWidth: 48, minHeight: 48'));
  assert.ok(source.includes('accessibilityLabel="Attach a photo, file, or contact"'));
  assert.ok(source.includes("accessibilityState={{ expanded: emojiOpen }}"));
  assert.ok(source.includes('emojiOpen ? hexToRgba(colors.primary, 0.15)'));
});

test('chat composer keeps a restrained elevated message surface with theme-aware focus colour', () => {
  assert.ok(source.includes('backgroundColor: hexToRgba(colors.surfaceElevated, 0.94)'));
  assert.ok(source.includes('borderColor: hexToRgba(colors.primary, 0.28)'));
  assert.ok(source.includes('borderRadius: 22'));
  assert.ok(source.includes('shadowOpacity: 0.07'));
});

test('chat composer retains draft persistence, attachment and send/record actions', () => {
  assert.ok(source.includes('saveDraft(draftKey, text)'));
  assert.ok(source.includes('onPress={onAttach}'));
  assert.ok(source.includes('onPress={text.trim() ? handleSend : onStartRecording}'));
  assert.ok(source.includes('onStopRecording'));
  assert.ok(source.includes('onCancelRecording'));
});
