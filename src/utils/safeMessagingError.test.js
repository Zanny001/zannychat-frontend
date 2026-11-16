import test from 'node:test';
import assert from 'node:assert/strict';
import { getSafeMessageSendError } from './safeMessagingError.js';

test('message send errors map known permission and stale-reference failures to safe guidance', () => {
  assert.match(getSafeMessageSendError({ code: '42501', message: 'secret schema detail' }), /permission/);
  assert.match(getSafeMessageSendError({ code: '23503', message: 'private row details' }), /no longer available/);
  assert.match(getSafeMessageSendError({ code: '23514' }), /invalid/);
});

test('unknown database errors never disclose raw backend messages', () => {
  const secret = 'relation private_customer_table does not exist';
  const message = getSafeMessageSendError({ code: 'XX000', message: secret, details: 'private detail' });
  assert.equal(message, 'Message could not be saved. Please try again.');
  assert.equal(message.includes(secret), false);
  assert.equal(message.includes('private detail'), false);
});

test('network failures give actionable but non-sensitive guidance', () => {
  assert.match(getSafeMessageSendError(new Error('fetch failed')), /connection/);
  assert.match(getSafeMessageSendError({}), /try again/);
});


test('permanent permission, stale-reference, validation and authentication failures are not retryable', async () => {
  const { isPermanentMessageSendError } = await import('./safeMessagingError.js');
  for (const error of [
    { code: '42501', message: 'permission denied' },
    { code: '23503', message: 'foreign key violation' },
    { code: '23514', message: 'check constraint' },
    { code: '22P02', message: 'invalid input' },
    { code: '22023', message: 'invalid parameter' },
    { code: 'AUTH_REQUIRED', message: 'not signed in' },
    { status: 403, message: 'forbidden' },
  ]) assert.equal(isPermanentMessageSendError(error), true, JSON.stringify(error));
});

test('network and unknown transient failures remain eligible for bounded retry', async () => {
  const { isPermanentMessageSendError } = await import('./safeMessagingError.js');
  assert.equal(isPermanentMessageSendError(new Error('fetch failed')), false);
  assert.equal(isPermanentMessageSendError({ code: '08006', message: 'connection failure' }), false);
  assert.equal(isPermanentMessageSendError({ message: 'Message could not be saved. Please try again.' }), false);
});
