import test from 'node:test';
import assert from 'node:assert/strict';
import { createSecureAuthStorage, secureAuthStorageLimits } from './secureAuthStorage.js';

function createMemoryStore() {
  const secure = new Map();
  const legacy = new Map();
  const options = [];
  return {
    secure,
    legacy,
    options,
    secureStore: {
      WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
      getItemAsync: async (key) => secure.has(key) ? secure.get(key) : null,
      setItemAsync: async (key, value, secureOptions) => { options.push(secureOptions); secure.set(key, value); },
      deleteItemAsync: async (key) => { secure.delete(key); },
    },
    legacyStorage: {
      getItem: async (key) => legacy.has(key) ? legacy.get(key) : null,
      setItem: async (key, value) => { legacy.set(key, value); },
      removeItem: async (key) => { legacy.delete(key); },
    },
  };
}

test('secure auth storage round-trips large UTF-8 sessions in bounded chunks', async () => {
  const memory = createMemoryStore();
  const storage = createSecureAuthStorage(memory);
  const session = JSON.stringify({ access_token: 'a'.repeat(4200), refresh_token: 'b'.repeat(2300), profile: '🙂'.repeat(900) });

  await storage.setItem('sb-zanny-auth-token', session);

  assert.equal(await storage.getItem('sb-zanny-auth-token'), session);
  const chunks = [...memory.secure.entries()].filter(([key]) => key.includes('.secure-v2.') && !key.endsWith('.manifest'));
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every(([, value]) => new TextEncoder().encode(value).byteLength <= secureAuthStorageLimits.chunkBytes));
  assert.equal(memory.legacy.has('sb-zanny-auth-token'), false);
});

test('session values use device-only Keychain accessibility when SecureStore supports it', async () => {
  const memory = createMemoryStore();
  const storage = createSecureAuthStorage(memory);
  await storage.setItem('sb-zanny-auth-token', 'device-only-session');
  assert.ok(memory.options.length >= 2);
  assert.ok(memory.options.every((options) => options?.keychainAccessible === 'WHEN_UNLOCKED_THIS_DEVICE_ONLY'));
});

test('first read migrates the existing AsyncStorage session and removes the legacy copy', async () => {
  const memory = createMemoryStore();
  memory.legacy.set('sb-zanny-auth-token', JSON.stringify({ access_token: 'existing-token' }));
  const storage = createSecureAuthStorage(memory);

  assert.equal(await storage.getItem('sb-zanny-auth-token'), JSON.stringify({ access_token: 'existing-token' }));
  assert.equal(memory.legacy.has('sb-zanny-auth-token'), false);
  assert.ok([...memory.secure.keys()].some((key) => key.endsWith('.secure-v2.manifest')));
});

test('a failed manifest write leaves the previous secure session readable', async () => {
  const memory = createMemoryStore();
  const storage = createSecureAuthStorage(memory);
  await storage.setItem('sb-zanny-auth-token', 'old-session');

  const originalSet = memory.secureStore.setItemAsync;
  memory.secureStore.setItemAsync = async (key, value) => {
    if (key.endsWith('.secure-v2.manifest')) throw new Error('simulated keychain write failure');
    return originalSet(key, value);
  };

  await assert.rejects(storage.setItem('sb-zanny-auth-token', 'new-session'), /keychain write failure/);
  memory.secureStore.setItemAsync = originalSet;
  assert.equal(await storage.getItem('sb-zanny-auth-token'), 'old-session');
});

test('removeItem deletes both secure and legacy session copies', async () => {
  const memory = createMemoryStore();
  const storage = createSecureAuthStorage(memory);
  await storage.setItem('sb-zanny-auth-token', 'session');
  memory.legacy.set('sb-zanny-auth-token', 'stale-legacy-session');

  await storage.removeItem('sb-zanny-auth-token');

  assert.equal(await storage.getItem('sb-zanny-auth-token'), null);
  assert.equal(memory.legacy.has('sb-zanny-auth-token'), false);
  assert.equal(memory.secure.get('sb-zanny-auth-token.secure-v2.revoked'), '1');
  assert.equal([...memory.secure.keys()].some((key) => key.includes('.secure-v2.manifest')), false);
  assert.equal([...memory.secure.keys()].some((key) => key.includes('.secure-v2.') && !key.endsWith('.revoked')), false);
});

test('oversized values fail without replacing the previous session', async () => {
  const memory = createMemoryStore();
  const storage = createSecureAuthStorage(memory);
  await storage.setItem('sb-zanny-auth-token', 'current-session');

  await assert.rejects(
    storage.setItem('sb-zanny-auth-token', 'x'.repeat(secureAuthStorageLimits.maxValueBytes + 1)),
    /exceeds the secure storage capacity/,
  );
  assert.equal(await storage.getItem('sb-zanny-auth-token'), 'current-session');
});

test('legacy session remains readable if SecureStore is temporarily unavailable during migration', async () => {
  const memory = createMemoryStore();
  memory.legacy.set('sb-zanny-auth-token', 'legacy-session');
  memory.secureStore.getItemAsync = async () => { throw new Error('native module unavailable'); };
  const storage = createSecureAuthStorage(memory);

  assert.equal(await storage.getItem('sb-zanny-auth-token'), 'legacy-session');
  assert.equal(memory.legacy.get('sb-zanny-auth-token'), 'legacy-session');
});

test('failed secure deletion leaves a revocation marker so the session cannot reappear', async () => {
  const memory = createMemoryStore();
  const storage = createSecureAuthStorage(memory);
  await storage.setItem('sb-zanny-auth-token', 'signed-in-session');

  const originalDelete = memory.secureStore.deleteItemAsync;
  memory.secureStore.deleteItemAsync = async (key) => {
    if (key.endsWith('.secure-v2.manifest')) throw new Error('simulated Keychain deletion failure');
    return originalDelete(key);
  };

  await assert.rejects(storage.removeItem('sb-zanny-auth-token'), /Keychain deletion failure/);
  assert.equal(await storage.getItem('sb-zanny-auth-token'), null);
  assert.equal(memory.legacy.get('sb-zanny-auth-token.secure-v2.revoked'), '1');
  assert.equal(memory.secure.get('sb-zanny-auth-token.secure-v2.revoked'), '1');

  // Simulate uninstall/reinstall: app-sandbox AsyncStorage is wiped, but
  // the iOS Keychain item remains. The secure revocation marker must still win.
  memory.legacy.clear();
  assert.equal(await storage.getItem('sb-zanny-auth-token'), null);

  memory.secureStore.deleteItemAsync = originalDelete;
  await storage.setItem('sb-zanny-auth-token', 'new-session');
  assert.equal(await storage.getItem('sb-zanny-auth-token'), 'new-session');
  assert.equal(memory.legacy.has('sb-zanny-auth-token.secure-v2.revoked'), false);
});
