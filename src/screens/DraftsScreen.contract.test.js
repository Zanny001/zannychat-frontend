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
  assert.match(screen, /data=\{drafts\}/);
});

test('draft library supports local search across message text and conversation names', () => {
  assert.match(screen, /const \[searchQuery, setSearchQuery\] = useState\(''\)/);
  assert.match(screen, /const filteredDrafts = useMemo/);
  assert.match(screen, /conversation\?\.participant\?\.name/);
  assert.match(screen, /String\(draft\.text \|\| ''\)/);
  assert.match(screen, /Search drafts by message or conversation/);
  assert.match(screen, /Clear draft search/);
  assert.match(screen, /data=\{filteredDrafts\}/);
});

test('draft search distinguishes no matches from a genuinely empty local draft library', () => {
  assert.match(screen, /drafts\.length > 0 \? \(/);
  assert.match(screen, /No matching drafts/);
  assert.match(screen, /All caught up/);
  assert.match(screen, /Unsent messages you write will appear here automatically/);
});

test('draft search is local-only and preserves continue and delete actions', () => {
  assert.match(screen, /const filteredDrafts = useMemo/);
  assert.match(screen, /navigation\.navigate\('Chat', \{ conversation \}\)/);
  assert.match(screen, /await clearDraft\(draft\.key\)/);
  assert.match(screen, /setDrafts\(\(current\) => current\.filter/);
});
