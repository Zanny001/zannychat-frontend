import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./DraftsScreen.js', import.meta.url), 'utf8');

test('draft conversation lookup failures with saved drafts expose an accessible retry action', () => {
  assert.match(screen, /drafts\.length > 0 \? \(/);
  assert.match(screen, /onPress=\{load\} accessibilityRole="button" accessibilityLabel="Retry loading draft conversations"/);
  assert.match(screen, /minHeight: 48/);
  assert.match(screen, /Retry conversation lookup/);
});

test('drafts remain visible when conversation details fail to load', () => {
  assert.match(screen, /error && drafts\.length === 0/);
  assert.match(screen, /ListHeaderComponent=\{/);
  assert.match(screen, /data=\{visibleDrafts\}/);
});

test('draft library supports local search by draft text and conversation name', () => {
  assert.match(screen, /const \[draftSearch, setDraftSearch\] = useState\(''\)/);
  assert.match(screen, /const visibleDrafts = useMemo/);
  assert.match(screen, /Search drafts/);
  assert.match(screen, /Search draft text or conversation/);
  assert.match(screen, /data=\{visibleDrafts\}/);
  assert.match(screen, /\{visibleDrafts\.length\} of \{drafts\.length\} drafts/);
  assert.match(screen, /No matching drafts/);
  assert.match(screen, /Clear draft search/);
});

test('draft search keeps local storage, conversation resolution and safe deletion behavior intact', () => {
  assert.match(screen, /loadDraftsForUser\(user\?\.id \|\| 'me'\)/);
  assert.match(screen, /conversationsById\.get\(draft\.conversationId\)/);
  assert.match(screen, /await clearDraft\(draft\.key\)/);
  assert.match(screen, /navigation\.navigate\('Chat', \{ conversation \}\)/);
});
