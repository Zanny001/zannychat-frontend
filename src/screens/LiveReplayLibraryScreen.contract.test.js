import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./LiveReplayLibraryScreen.js', import.meta.url), 'utf8');

test('LIVE replay library loads authenticated account-scoped replay data from the existing backend route', () => {
  assert.ok(screen.includes("backendFetch('/live/replays')"));
  assert.ok(screen.includes('getCurrentUser()'));
  assert.ok(screen.includes('latest?.id !== expectedUserId'));
  assert.ok(screen.includes('supabase.auth.onAuthStateChange'));
});

test('LIVE replay library separates ready, processing and unavailable recordings', () => {
  assert.ok(screen.includes("value: 'mine'"));
  assert.ok(screen.includes("value: 'ready'"));
  assert.ok(screen.includes("value: 'processing'"));
  assert.ok(screen.includes("value: 'failed'"));
  assert.ok(screen.includes("PENDING.has(item.status)"));
  assert.ok(screen.includes('readyCount'));
  assert.ok(screen.includes('processingCount'));
});

test('only ready recordings can open the existing signed playback screen', () => {
  assert.ok(screen.includes("item.status === 'ready'"));
  assert.ok(screen.includes('item.creatorId === currentUserId'));
  assert.ok(screen.includes("navigation.navigate('LiveReplay', { replay: item })"));
  assert.ok(screen.includes("backendFetch('/live/replays/' + encodeURIComponent(item.id), { method: 'DELETE' })"));
  assert.ok(screen.includes('item.creatorId !== activeUserIdRef.current'));
  assert.ok(screen.includes('if (!item?.id || item.creatorId !== activeUserIdRef.current || PENDING.has(item.status)) return'));
});

test('replay library supports accessible filters, refresh, errors and empty states', () => {
  assert.ok(screen.includes('accessibilityRole="radio"'));
  assert.ok(screen.includes('accessibilityState={{ checked: selected }}'));
  assert.ok(screen.includes('onRefresh={() => refresh(true)}'));
  assert.ok(screen.includes('Retry loading replay library'));
  assert.ok(screen.includes('No replays in this view'));
});

const liveHub = fs.readFileSync(new URL('./LiveHubScreen.js', import.meta.url), 'utf8');
const creatorStudio = fs.readFileSync(new URL('./LiveCreatorStudioScreen.js', import.meta.url), 'utf8');

test('LIVE Hub replay deletion verifies ownership, active identity and pending status', () => {
  assert.ok(liveHub.includes('item.creatorId !== expectedUserId'));
  assert.ok(liveHub.includes('activeUserIdRef.current !== expectedUserId'));
  assert.ok(liveHub.includes('beforeConfirmUser?.id !== expectedUserId'));
  assert.ok(liveHub.includes('userAfterDelete?.id !== expectedUserId'));
  assert.ok(liveHub.includes("['starting', 'recording', 'processing'].includes(item.status)"));
});

test('creator studio replay deletion is owner-only in both UI and handler', () => {
  assert.ok(creatorStudio.includes('getReplayCreatorId(item) !== expectedUserId'));
  assert.ok(creatorProfile.includes('getReplayCreatorId(item) === activeUserIdRef.current'));
  assert.ok(creatorProfile.includes('item?.creator_id || profile.id'));
  assert.ok(creatorProfile.includes('beforeConfirmUser?.id !== expectedUserId'));
  assert.ok(creatorProfile.includes('userAfterDelete?.id !== expectedUserId'));
});
