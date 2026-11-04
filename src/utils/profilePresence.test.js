import test from 'node:test';
import assert from 'node:assert/strict';
import { getProfilePresence } from './profilePresence.js';

const now = new Date('2026-10-23T10:00:00.000Z').getTime();

test('profile presence preserves normal online display when no privacy flags exist', () => {
  const result = getProfilePresence({ online: true }, now);
  assert.equal(result.online, true);
  assert.equal(result.presence, 'Online now');
});

test('explicitly hidden online state is not exposed', () => {
  const result = getProfilePresence({ online: true, show_online_status: false }, now);
  assert.equal(result.online, false);
  assert.equal(result.presence, 'ZannyChat contact');
});

test('explicitly hidden last-seen timestamp is not exposed', () => {
  const result = getProfilePresence({ online: false, last_seen_at: '2026-10-22T10:00:00.000Z', privacy: { hide_last_seen: true } }, now);
  assert.equal(result.lastSeenVisible, false);
  assert.equal(result.presence, 'ZannyChat contact');
});

test('invalid and future last-seen timestamps are not displayed', () => {
  assert.equal(getProfilePresence({ last_seen_at: 'not-a-date' }, now).presence, 'ZannyChat contact');
  assert.equal(getProfilePresence({ last_seen_at: '2026-10-24T10:00:00.000Z' }, now).presence, 'ZannyChat contact');
});

test('explicit hide flag takes precedence over an explicit show flag', () => {
  const result = getProfilePresence({ online: true, showOnlineStatus: true, hideOnlineStatus: true }, now);
  assert.equal(result.online, false);
});
