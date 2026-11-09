import test from 'node:test';
import assert from 'node:assert/strict';
import { isMissingRpcFunction } from './rpcErrors.js';

test('detects only the named RPC missing from the PostgREST schema cache', () => {
  assert.equal(isMissingRpcFunction({
    code: 'PGRST202',
    message: 'Could not find the function public.get_my_read_cursors without parameters in the schema cache',
  }, 'get_my_read_cursors'), true);
});

test('does not misclassify another missing RPC', () => {
  assert.equal(isMissingRpcFunction({
    code: 'PGRST202',
    message: 'Could not find the function public.other_function without parameters in the schema cache',
  }, 'get_my_read_cursors'), false);
});

test('does not hide authorization, validation, or network errors', () => {
  assert.equal(isMissingRpcFunction({ code: '42501', message: 'permission denied' }, 'get_my_read_cursors'), false);
  assert.equal(isMissingRpcFunction({ code: 'PGRST202', message: 'schema cache miss' }, 'get_my_read_cursors'), false);
  assert.equal(isMissingRpcFunction(null, 'get_my_read_cursors'), false);
});
