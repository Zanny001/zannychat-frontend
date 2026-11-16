import test from 'node:test';
import assert from 'node:assert/strict';
import { deletePushTokenRows } from './pushTokenCleanup.js';

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
