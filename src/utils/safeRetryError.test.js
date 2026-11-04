import test from 'node:test';
import assert from 'node:assert/strict';
import { getSafeRetryError, normalizeSafeRetryError } from './safeRetryError.js';

test('retry errors map known database failures to actionable safe messages', () => {
  assert.match(getSafeRetryError({ code: '42501', message: 'secret table policy' }), /permission/);
  assert.match(getSafeRetryError({ code: '23503', details: 'private row id' }), /no longer available/);
  assert.match(getSafeRetryError({ code: '23514' }), /invalid/);
});

test('retry errors never disclose provider details or raw schema text', () => {
  const secret = 'relation private_schema.messages does not exist; token=abc123';
  for (const operation of ['message', 'attachment']) {
    const result = getSafeRetryError({ code: 'XX000', message: secret, details: secret }, operation);
    assert.equal(result.includes('private_schema'), false);
    assert.equal(result.includes('abc123'), false);
    assert.equal(result.includes('does not exist'), false);
  }
});

test('network failures get actionable guidance and legacy stored errors are sanitized', () => {
  assert.match(getSafeRetryError(new Error('fetch failed')), /connection/);
  const legacy = normalizeSafeRetryError('Postgres ERROR: private_schema.messages not found');
  assert.ok(legacy);
  assert.equal(legacy.includes('private_schema'), false);
  assert.equal(normalizeSafeRetryError(null), null);
});
