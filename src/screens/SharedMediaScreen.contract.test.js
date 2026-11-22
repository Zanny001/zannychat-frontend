import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./SharedMediaScreen.js', import.meta.url), 'utf8');

test('Shared Media lightbox close action meets the 48-point mobile touch target', () => {
  assert.ok(screen.includes("lightboxClose: { position: 'absolute', top: 44, right: 20, zIndex: 2, width: 48, height: 48"));
  assert.ok(screen.includes('accessibilityLabel="Close photo preview"'));
});

test('Shared Media initial-load failure exposes a retry action instead of an empty result', () => {
  assert.ok(screen.includes('error && messages.length === 0'));
  assert.match(screen, /Retry loading shared media/);
  assert.ok(screen.includes('onPress={loadInitial}'));
});

test('Shared Media tab controls expose selected state and accessible labels', () => {
  assert.match(screen, /accessibilityRole="tab"/);
  assert.ok(screen.includes('accessibilityState={{ selected: active }}'));
  assert.match(screen, /accessibilityLabel=/);
});

test('Shared Media overview reflects the active category and its live item count', () => {
  assert.match(screen, /A SHARED SPACE FOR THE GOOD STUFF/);
  assert.match(screen, /Moments worth revisiting\./);
  assert.match(screen, /Everything sent, in reach\./);
  assert.match(screen, /Follow the conversation outward\./);
  assert.match(screen, /\{currentItems\.length\}/);
  assert.match(screen, /Private attachments may use expiring access links/);
});

test('Shared Media overview remains derived from classified conversation data', () => {
  assert.match(screen, /const content = useMemo\(\(\) => classifySharedContent\(messages\)/);
  assert.match(screen, /const currentItems = content\[tab\] \|\| \[\]/);
  assert.match(screen, /filterSharedItems\(currentItems, searchQuery\)/);
});
