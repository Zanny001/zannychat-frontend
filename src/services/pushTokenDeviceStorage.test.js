import test from 'node:test';
import assert from 'node:assert/strict';
import { clearExpoPushToken, expoPushTokenStorageKey, persistExpoPushToken, readExpoPushToken } from './pushTokenDeviceStorage.js';

function memoryStorage() {
  const values = new Map();
  return {
    values,
    async setItem(key, value) { values.set(key, value); },
    async getItem(key) { return values.get(key) ?? null; },
    async removeItem(key) { values.delete(key); },
  };
}

test('stores and retrieves a token in a user-scoped device key', async () => {
  const storage = memoryStorage();
  await persistExpoPushToken({ storage, userId: 'user-a', token: 'ExponentPushToken[abc]' });
  assert.equal(await readExpoPushToken({ storage, userId: 'user-a' }), 'ExponentPushToken[abc]');
  assert.equal(await readExpoPushToken({ storage, userId: 'user-b' }), null);
});

test('clears only the selected account token', async () => {
  const storage = memoryStorage();
  await persistExpoPushToken({ storage, userId: 'user-a', token: 'token-a' });
  await persistExpoPushToken({ storage, userId: 'user-b', token: 'token-b' });
  await clearExpoPushToken({ storage, userId: 'user-a' });
  assert.equal(await readExpoPushToken({ storage, userId: 'user-a' }), null);
  assert.equal(await readExpoPushToken({ storage, userId: 'user-b' }), 'token-b');
});

test('rejects invalid user ids and tokens', async () => {
  const storage = memoryStorage();
  assert.throws(() => expoPushTokenStorageKey(''), /user id/);
  await assert.rejects(persistExpoPushToken({ storage, userId: 'user-a', token: '' }), /valid Expo push token/);
});
