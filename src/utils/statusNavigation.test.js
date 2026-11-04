import test from 'node:test';
import assert from 'node:assert/strict';
import { adjustStatusDuration, DEFAULT_STATUS_DURATIONS, getAdjacentStatus, getAdjacentStoryStatus, getStatusDurationMs } from './statusNavigation.js';

const futureExpiry = () => new Date(Date.now() + 60_000).toISOString();
const rows = [{ id: 'newest', expires_at: futureExpiry() }, { id: 'middle', expires_at: futureExpiry() }, { id: 'oldest', expires_at: futureExpiry() }];

test('status navigation returns adjacent items in feed order', () => {
  assert.equal(getAdjacentStatus(rows, 'middle', -1), rows[0]);
  assert.equal(getAdjacentStatus(rows, 'middle', 1), rows[2]);
});

test('status navigation stops at feed edges rather than wrapping', () => {
  assert.equal(getAdjacentStatus(rows, 'newest', -1), null);
  assert.equal(getAdjacentStatus(rows, 'oldest', 1), null);
});

test('status navigation safely handles invalid input and missing current status', () => {
  assert.equal(getAdjacentStatus(null, 'x', 1), null);
  assert.equal(getAdjacentStatus(rows, 'missing', 1), null);
  assert.equal(getAdjacentStatus(rows, 'middle', 0), null);
});


test('story dwell time is appropriate for text, images, and videos', () => {
  assert.equal(getStatusDurationMs({ media_kind: 'text' }), 10000);
  assert.equal(getStatusDurationMs({ media_kind: 'image' }), 15000);
  assert.equal(getStatusDurationMs({ media_kind: 'video' }), 60000);
  assert.equal(getStatusDurationMs(null), 10000);
});

test('status dwell preferences can be increased and decreased in five-second steps', () => {
  const longer = adjustStatusDuration(DEFAULT_STATUS_DURATIONS, 'text', 5000);
  assert.equal(getStatusDurationMs({ media_kind: 'text' }, longer), 15000);
  const shorter = adjustStatusDuration(longer, 'text', -5000);
  assert.equal(getStatusDurationMs({ media_kind: 'text' }, shorter), 10000);
});

test('status dwell preferences remain within five-to-sixty-second bounds', () => {
  assert.equal(getStatusDurationMs({ media_kind: 'text' }, { text: 1 }), 5000);
  assert.equal(getStatusDurationMs({ media_kind: 'image' }, { image: 999999 }), 60000);
  assert.equal(getStatusDurationMs({ media_kind: 'video' }, { video: 'invalid' }), 60000);
  assert.equal(getStatusDurationMs({ media_kind: 'text' }, {}), 10000);
});


test('story navigation follows the same owner chronologically before leaving the story', () => {
  const stories = [
    { id: 'a-new', user_id: 'a', created_at: '2026-10-22T10:00:00Z', expires_at: futureExpiry() },
    { id: 'b-new', user_id: 'b', created_at: '2026-10-22T09:30:00Z', expires_at: futureExpiry() },
    { id: 'a-old', user_id: 'a', created_at: '2026-10-22T09:00:00Z', expires_at: futureExpiry() },
  ];
  assert.equal(getAdjacentStoryStatus(stories, 'a-old', 1), stories[0]);
  assert.equal(getAdjacentStoryStatus(stories, 'a-new', -1), stories[2]);
});

test('story navigation falls back to the global feed when the owner sequence ends', () => {
  const stories = [
    { id: 'a-new', user_id: 'a', created_at: '2026-10-22T10:00:00Z', expires_at: futureExpiry() },
    { id: 'b-new', user_id: 'b', created_at: '2026-10-22T09:30:00Z', expires_at: futureExpiry() },
    { id: 'a-old', user_id: 'a', created_at: '2026-10-22T09:00:00Z', expires_at: futureExpiry() },
  ];
  assert.equal(getAdjacentStoryStatus(stories, 'a-new', 1), stories[1]);
  assert.equal(getAdjacentStoryStatus(stories, 'a-old', -1), stories[1]);
});


test('status navigation skips expired and malformed rows rather than opening them', () => {
  const now = Date.now();
  const feed = [
    { id: 'newer', expires_at: new Date(now + 60_000).toISOString() },
    { id: 'expired', expires_at: new Date(now - 1).toISOString() },
    { id: 'older', expires_at: new Date(now + 60_000).toISOString() },
    { id: 'invalid', expires_at: 'not-a-date' },
  ];
  assert.equal(getAdjacentStatus(feed, 'newer', 1, now), feed[2]);
  assert.equal(getAdjacentStatus(feed, 'older', -1, now), feed[0]);
  assert.equal(getAdjacentStatus(feed, 'expired', 1, now), null);
  assert.equal(getAdjacentStatus(feed, 'newer', 1, now + 120_000), null);
});

test('story navigation skips expired stories inside the owner sequence and global feed', () => {
  const now = Date.now();
  const feed = [
    { id: 'a-new', user_id: 'a', created_at: '2026-10-22T10:00:00Z', expires_at: new Date(now + 60_000).toISOString() },
    { id: 'b-expired', user_id: 'b', created_at: '2026-10-22T09:30:00Z', expires_at: new Date(now - 1).toISOString() },
    { id: 'a-expired', user_id: 'a', created_at: '2026-10-22T09:00:00Z', expires_at: new Date(now - 1).toISOString() },
    { id: 'c-next', user_id: 'c', created_at: '2026-10-22T08:30:00Z', expires_at: new Date(now + 60_000).toISOString() },
  ];
  assert.equal(getAdjacentStoryStatus(feed, 'a-new', 1, now), feed[3]);
  assert.equal(getAdjacentStoryStatus(feed, 'a-expired', -1, now), null);
});
