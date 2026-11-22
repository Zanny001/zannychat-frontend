import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('./LiveModerationScreen.js', import.meta.url), 'utf8');

test('LIVE moderation searches loaded participants by name or role alongside role filters', () => {
  assert.ok(screen.includes("const [searchQuery, setSearchQuery] = useState('')"));
  assert.ok(screen.includes('Search participants by name or role'));
  assert.ok(screen.includes('const visibleParticipants = useMemo'));
  assert.ok(screen.includes('searchQuery.trim().toLowerCase()'));
  assert.ok(screen.includes("participantFilter === 'viewers'"));
  assert.ok(screen.includes("participantFilter === 'guests'"));
  assert.ok(screen.includes("participantFilter === 'moderators'"));
  assert.ok(screen.includes('data={visibleParticipants}'));
});

test('LIVE moderation search has clear and search-specific empty states', () => {
  assert.ok(screen.includes('Clear participant search'));
  assert.ok(screen.includes('No matching participants'));
  assert.ok(screen.includes('Try another name or role, or clear your search.'));
});

test('LIVE moderation search preserves stream-scoped APIs and guarded moderation actions', () => {
  assert.ok(screen.includes('/participants`'));
  assert.ok(screen.includes('/moderators`'));
  assert.ok(screen.includes('/mute`'));
  assert.ok(screen.includes('actionLock.current'));
  assert.ok(screen.includes('confirmAction('));
});
