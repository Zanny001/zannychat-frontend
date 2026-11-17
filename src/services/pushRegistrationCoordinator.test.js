import test from 'node:test';
import assert from 'node:assert/strict';
import { createPushRegistrationCoordinator } from './pushRegistrationCoordinator.js';

test('deduplicates initial-session and SIGNED_IN registration for the same account', async () => {
  const calls = [];
  const coordinator = createPushRegistrationCoordinator(async (userId) => {
    calls.push(userId);
    return 'expo-token';
  });

  const first = coordinator.registerForUser('user-a');
  const duplicate = coordinator.registerForUser('user-a');
  assert.equal(await first, 'expo-token');
  assert.equal(await duplicate, 'expo-token');
  assert.deepEqual(calls, ['user-a']);
});

test('registers again when the active account changes', async () => {
  const calls = [];
  const coordinator = createPushRegistrationCoordinator(async (userId) => {
    calls.push(userId);
    return userId;
  });

  await coordinator.registerForUser('user-a');
  await coordinator.registerForUser('user-b');
  assert.deepEqual(calls, ['user-a', 'user-b']);
});

test('allows the same account to register again after sign-out reset', async () => {
  const calls = [];
  const coordinator = createPushRegistrationCoordinator(async (userId) => {
    calls.push(userId);
    return userId;
  });

  await coordinator.registerForUser('user-a');
  coordinator.reset();
  await coordinator.registerForUser('user-a');
  assert.deepEqual(calls, ['user-a', 'user-a']);
});

test('does not start registration without an authenticated user id', async () => {
  let calls = 0;
  const coordinator = createPushRegistrationCoordinator(async () => {
    calls += 1;
  });

  assert.equal(await coordinator.registerForUser(null), null);
  assert.equal(await coordinator.registerForUser(''), null);
  assert.equal(calls, 0);
});

test('clears a failed in-flight registration so it can be retried', async () => {
  let calls = 0;
  const coordinator = createPushRegistrationCoordinator(async () => {
    calls += 1;
    if (calls === 1) throw new Error('temporary failure');
    return 'ok';
  });

  await assert.rejects(coordinator.registerForUser('user-a'), /temporary failure/);
  assert.equal(await coordinator.registerForUser('user-a'), 'ok');
  assert.equal(calls, 2);
});

test('allows a later retry when registration returns null', async () => {
  let calls = 0;
  const coordinator = createPushRegistrationCoordinator(async () => {
    calls += 1;
    return calls === 1 ? null : 'registered';
  });

  assert.equal(await coordinator.registerForUser('user-a'), null);
  assert.equal(await coordinator.registerForUser('user-a'), 'registered');
  assert.equal(calls, 2);
});
