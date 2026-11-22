import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('./LiveModerationScreen.js', import.meta.url), 'utf8');

test('LIVE moderation searches loaded participants by name or role alongside role filters', () => {
  assert.match(screen, /const \\[searchQuery, setSearchQuery\\] = useState\\(''\\)/);
  assert.match(screen, /Search participants by name or role/);
  assert.match(screen, /const visibleParticipants = useMemo/);
  assert.match(screen, /searchQuery\\.trim\\(\\)\\.toLowerCase\\(\\)/);
  assert.match(screen, /participantFilter === 'viewers'/);
  assert.match(screen, /participantFilter === 'guests'/);
  assert.match(screen, /participantFilter === 'moderators'/);
  assert.match(screen, /data=\\{visibleParticipants\\}/);
});

test('LIVE moderation search has clear and search-specific empty states', () => {
  assert.match(screen, /Clear participant search/);
  assert.match(screen, /No matching participants/);
  assert.match(screen, /Try another name or role, or clear your search/);
});

test('LIVE moderation search preserves stream-scoped APIs and guarded moderation actions', () => {
  assert.match(screen, /participants`\\)/);
  assert.match(screen, /moderators`/);
  assert.match(screen, /guests\\/\\$\\{item\\.userId\\}\\/mute`/);
  assert.match(screen, /actionLock\\.current/);
  assert.match(screen, /confirmAction\\(/);
});
