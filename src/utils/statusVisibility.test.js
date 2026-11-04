import test from 'node:test';
import assert from 'node:assert/strict';
import { filterVisibleStatusRows } from './statusVisibility.js';

const futureExpiry = '2099-01-01T00:00:00.000Z';
const rows = [
  { id: 'own-private', user_id: 'me', audience: 'only_me', expires_at: futureExpiry },
  { id: 'contact-private', user_id: 'alice', audience: 'only_me', expires_at: futureExpiry },
  { id: 'contact-public', user_id: 'bob', audience: 'contacts', expires_at: futureExpiry },
  { id: 'muted', user_id: 'muted-user', audience: 'contacts', expires_at: futureExpiry },
  { id: 'excluded', user_id: 'excluded-user', audience: 'contacts', expires_at: futureExpiry },
  { id: 'selected-audience', user_id: 'dave', audience: 'selected_contacts', expires_at: futureExpiry },
  { id: 'unknown-audience', user_id: 'carol', audience: null, expires_at: futureExpiry },
  { user_id: 'missing-id', audience: 'contacts', expires_at: futureExpiry },
];

test('keeps own statuses while hiding other users’ only-me statuses', () => {
  assert.deepEqual(filterVisibleStatusRows(rows, 'me').map((row) => row.id), [
    'own-private', 'contact-public', 'muted', 'excluded',
  ]);
});

test('continues respecting muted and excluded owner filters and fails closed for unknown audiences', () => {
  assert.deepEqual(filterVisibleStatusRows(rows, 'me', ['muted-user'], ['excluded-user']).map((row) => row.id), [
    'own-private', 'contact-public',
  ]);
});

test('selected-contact statuses are shown only when the current user is an explicit recipient', () => {
  assert.deepEqual(filterVisibleStatusRows(rows, 'me', [], [], ['selected-audience']).map((row) => row.id), [
    'own-private', 'contact-public', 'muted', 'excluded', 'selected-audience',
  ]);
});

test('returns an empty list for malformed feed data', () => {
  assert.deepEqual(filterVisibleStatusRows(null, 'me'), []);
  assert.deepEqual(filterVisibleStatusRows([null, {}, { id: 'x' }], 'me'), []);
});


test('expired, malformed-expiry, and missing-expiry statuses are hidden even when owned by viewer', () => {
  const sample = [
    { id: 'expired-own', user_id: 'me', audience: 'only_me', expires_at: '2020-01-01T00:00:00.000Z' },
    { id: 'bad-expiry', user_id: 'me', audience: 'only_me', expires_at: 'not-a-date' },
    { id: 'missing-expiry', user_id: 'me', audience: 'only_me' },
    { id: 'active-own', user_id: 'me', audience: 'only_me', expires_at: '2030-01-01T00:00:00.000Z' },
  ];
  assert.deepEqual(filterVisibleStatusRows(sample, 'me', [], [], [], Date.parse('2026-01-01T00:00:00.000Z')).map((row) => row.id), ['active-own']);
});
