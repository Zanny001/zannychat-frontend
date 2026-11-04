import test from 'node:test';
import assert from 'node:assert/strict';
import { isStatusActiveAt, removeExpiredStatuses } from './statusExpiry.js';

const now = Date.parse('2026-10-23T12:00:00.000Z');
const active = { id: 'active', expires_at: '2026-10-23T12:00:01.000Z' };
const expired = { id: 'expired', expires_at: '2026-10-23T11:59:59.000Z' };

test('status expiry is strict at the expiry instant and rejects invalid timestamps', () => {
  assert.equal(isStatusActiveAt(active, now), true);
  assert.equal(isStatusActiveAt({ id: 'at-boundary', expires_at: new Date(now).toISOString() }, now), false);
  assert.equal(isStatusActiveAt(expired, now), false);
  assert.equal(isStatusActiveAt({ id: 'invalid', expires_at: 'not-a-date' }, now), false);
  assert.equal(isStatusActiveAt({ id: 'missing' }, now), false);
});

test('loaded status feeds drop expired and malformed rows without mutating source arrays', () => {
  const source = [active, expired, { id: 'malformed', expires_at: 'invalid' }];
  assert.deepEqual(removeExpiredStatuses(source, now), [active]);
  assert.equal(source.length, 3);
  assert.deepEqual(removeExpiredStatuses(null, now), []);
});


test('status screen prunes immediately and on foreground after background timer throttling', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../screens/StatusUpdatesScreen.js', import.meta.url), 'utf8');
  assert.match(source, /import \{[^}]*AppState[^}]*\} from 'react-native'/);
  assert.match(source, /pruneExpired\(\);\s*const timer = setInterval\(pruneExpired, 15000\)/);
  assert.match(source, /AppState\.addEventListener\('change', \(state\) => \{\s*if \(state === 'active'\) pruneExpired\(\)/);
  assert.match(source, /appStateSubscription\?\.remove\?\.\(\)/);
});
