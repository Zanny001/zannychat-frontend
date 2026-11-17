import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getStatusDurationStorageKey,
  normalizeStatusDurationPreferences,
  readStatusDurationPreferences,
  writeStatusDurationPreferences,
} from './statusDurationStorage.js';

test('normalizes duration preferences and clamps values to supported bounds', () => {
  assert.deepEqual(normalizeStatusDurationPreferences({ text: 1000, image: 20000, video: 999999 }), {
    text: 5000,
    image: 20000,
    video: 60000,
  });
});

test('persists status duration preferences per authenticated account', async () => {
  const values = new Map();
  const storage = {
    async getItem(key) { return values.get(key) ?? null; },
    async setItem(key, value) { values.set(key, value); },
    async removeItem(key) { values.delete(key); },
  };
  assert.equal(getStatusDurationStorageKey(''), null);
  assert.equal(getStatusDurationStorageKey('user-a'), 'zannychat.status-duration-preferences.v1.user-a');
  assert.equal(await writeStatusDurationPreferences(storage, 'user-a', { text: 20000, image: 25000, video: 30000 }), true);
  assert.deepEqual(await readStatusDurationPreferences(storage, 'user-a'), { text: 20000, image: 25000, video: 30000 });
  assert.deepEqual(await readStatusDurationPreferences(storage, 'user-b'), { text: 10000, image: 15000, video: 60000 });
});

test('discards legacy global duration preferences instead of sharing between accounts', async () => {
  const values = new Map([['zannychat.status-duration-preferences.v1', JSON.stringify({ text: 60000 })]]);
  const storage = {
    async getItem(key) { return values.get(key) ?? null; },
    async removeItem(key) { values.delete(key); },
  };
  assert.deepEqual(await readStatusDurationPreferences(storage, 'user-a'), { text: 10000, image: 15000, video: 60000 });
  assert.equal(values.has('zannychat.status-duration-preferences.v1'), false);
});
