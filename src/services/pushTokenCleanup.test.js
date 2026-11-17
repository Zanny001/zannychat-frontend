import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanupExpoPushTokensForSignOut, deletePushTokenRows } from './pushTokenCleanup.js';
import { persistExpoPushToken, readExpoPushToken } from './pushTokenDeviceStorage.js';

function makeSupabase({ error = null } = {}) {
  const calls = [];
  const query = {
    eq(column, value) {
      calls.push([column, value]);
      return this;
    },
    then(resolve) {
      return Promise.resolve({ error }).then(resolve);
    },
  };
  const supabase = {
    from(table) {
      calls.push(['from', table]);
      return {
        delete() {
          calls.push(['delete']);
          return query;
        },
      };
    },
  };
  return { supabase, calls };
}

test('device-local sign-out deletes only the active user device token', async () => {
  const { supabase, calls } = makeSupabase();
  assert.equal(await deletePushTokenRows({ supabase, userId: 'user-a', expoPushToken: 'ExponentPushToken[abc]' }), true);
  assert.deepEqual(calls, [
    ['from', 'push_tokens'],
    ['delete'],
    ['user_id', 'user-a'],
    ['expo_push_token', 'ExponentPushToken[abc]'],
  ]);
});

test('explicit global sign-out deletes all tokens belonging to the account', async () => {
  const { supabase, calls } = makeSupabase();
  await deletePushTokenRows({ supabase, userId: 'user-a' });
  assert.deepEqual(calls, [
    ['from', 'push_tokens'],
    ['delete'],
    ['user_id', 'user-a'],
  ]);
});

test('does not permit an absent account or an invalid local token', async () => {
  const { supabase } = makeSupabase();
  await assert.rejects(deletePushTokenRows({ supabase, userId: null }), /authenticated user id/);
  await assert.rejects(deletePushTokenRows({ supabase, userId: 'user-a', expoPushToken: '' }), /valid Expo token/);
});

test('surfaces database errors to the caller', async () => {
  const { supabase } = makeSupabase({ error: new Error('RLS denied') });
  await assert.rejects(deletePushTokenRows({ supabase, userId: 'user-a' }), /RLS denied/);
});


function makeStorage() {
  const values = new Map();
  return {
    values,
    async setItem(key, value) { values.set(key, value); },
    async getItem(key) { return values.get(key) ?? null; },
    async removeItem(key) { values.delete(key); },
  };
}

test('local sign-out revokes the cached device token and clears cache only after deletion', async () => {
  const { supabase, calls } = makeSupabase();
  const storage = makeStorage();
  await persistExpoPushToken({ storage, userId: 'user-a', token: 'token-a' });
  await persistExpoPushToken({ storage, userId: 'user-b', token: 'token-b' });

  assert.equal(await cleanupExpoPushTokensForSignOut({ supabase, storage, userId: 'user-a', scope: 'local' }), true);
  assert.deepEqual(calls, [
    ['from', 'push_tokens'],
    ['delete'],
    ['user_id', 'user-a'],
    ['expo_push_token', 'token-a'],
  ]);
  assert.equal(await readExpoPushToken({ storage, userId: 'user-a' }), null);
  assert.equal(await readExpoPushToken({ storage, userId: 'user-b' }), 'token-b');
});

test('local sign-out uses the legacy token resolver only when no cached token exists', async () => {
  const { supabase, calls } = makeSupabase();
  const storage = makeStorage();
  let resolutions = 0;
  const result = await cleanupExpoPushTokensForSignOut({
    supabase, storage, userId: 'user-a', scope: 'local',
    resolveExpoPushToken: async () => { resolutions += 1; return 'legacy-token'; },
  });
  assert.equal(result, true);
  assert.equal(resolutions, 1);
  assert.deepEqual(calls.slice(-2), [['user_id', 'user-a'], ['expo_push_token', 'legacy-token']]);
});

test('local sign-out retains the cached token when server deletion fails', async () => {
  const { supabase, calls } = makeSupabase({ error: new Error('RLS denied') });
  const storage = makeStorage();
  await persistExpoPushToken({ storage, userId: 'user-a', token: 'token-a' });
  await assert.rejects(cleanupExpoPushTokensForSignOut({ supabase, storage, userId: 'user-a', scope: 'local' }), /RLS denied/);
  assert.equal(await readExpoPushToken({ storage, userId: 'user-a' }), 'token-a');
  assert.equal(calls.filter((entry) => entry[0] === 'expo_push_token').length, 1);
});

test('local sign-out never broadens deletion when neither cached nor resolved token exists', async () => {
  const { supabase, calls } = makeSupabase();
  const storage = makeStorage();
  assert.equal(await cleanupExpoPushTokensForSignOut({ supabase, storage, userId: 'user-a', scope: 'local' }), false);
  assert.deepEqual(calls, []);
});

test('global sign-out deletes account tokens and clears its local token cache', async () => {
  const { supabase, calls } = makeSupabase();
  const storage = makeStorage();
  await persistExpoPushToken({ storage, userId: 'user-a', token: 'token-a' });
  assert.equal(await cleanupExpoPushTokensForSignOut({ supabase, storage, userId: 'user-a', scope: 'global' }), true);
  assert.deepEqual(calls, [['from', 'push_tokens'], ['delete'], ['user_id', 'user-a']]);
  assert.equal(await readExpoPushToken({ storage, userId: 'user-a' }), null);
});
