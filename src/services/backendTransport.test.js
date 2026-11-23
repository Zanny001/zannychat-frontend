import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackendTransport } from './backendTransport.js';

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

test('backendFetch attaches the current Supabase bearer token and preserves caller headers', async () => {
  let request;
  const transport = createBackendTransport({
    backendUrl: 'https://api.example.test/',
    supabaseEnabled: true,
    supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'session-token' } } }) } },
    fetchImpl: async (url, options) => {
      request = { url, options };
      return response({ ok: true });
    },
  });

  const result = await transport.backendFetch('/conversations', {
    method: 'POST',
    body: JSON.stringify({ name: 'test' }),
    headers: { 'X-Request-Id': 'req-1' },
  });

  assert.deepEqual(result, { ok: true });
  assert.equal(request.url, 'https://api.example.test/conversations');
  assert.equal(request.options.headers.Authorization, 'Bearer session-token');
  assert.equal(request.options.headers['Content-Type'], 'application/json');
  assert.equal(request.options.headers['X-Request-Id'], 'req-1');
  assert.equal(request.options.method, 'POST');
});

test('backendFetch exposes safe HTTP errors with the provider status', async () => {
  const transport = createBackendTransport({
    backendUrl: 'https://api.example.test',
    fetchImpl: async () => response({ error: 'Not a conversation member' }, 403),
  });

  await assert.rejects(
    transport.backendFetch('/conversations/private/members'),
    (error) => error.status === 403 && error.message === 'Not a conversation member',
  );
});

test('backendFetch bounds the whole request and redacts query strings from diagnostics', async () => {
  const logs = [];
  let requestSignal;
  const transport = createBackendTransport({
    backendUrl: 'https://api.example.test',
    defaultRequestTimeoutMs: 15,
    debugLog: (...args) => logs.push(args),
    fetchImpl: async (_url, options) => {
      requestSignal = options.signal;
      return new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
      });
    },
  });

  await assert.rejects(
    transport.backendFetch('/link-preview?url=https%3A%2F%2Fprivate.example%2Ftoken%3Dsecret'),
    (error) => error.code === 'ETIMEDOUT' && error.name === 'TimeoutError',
  );
  assert.equal(requestSignal.aborted, true);
  assert.equal(JSON.stringify(logs).includes('private.example'), false);
  assert.equal(JSON.stringify(logs).includes('secret'), false);
});

test('backendFetch bounds Supabase session restoration before contacting the API', async () => {
  let fetchCalled = false;
  const transport = createBackendTransport({
    backendUrl: 'https://api.example.test',
    supabaseEnabled: true,
    sessionRestoreTimeoutMs: 15,
    supabase: { auth: { getSession: () => new Promise(() => {}) } },
    fetchImpl: async () => { fetchCalled = true; return response({}); },
  });

  await assert.rejects(
    transport.backendFetch('/account/delete'),
    (error) => error.code === 'ETIMEDOUT',
  );
  assert.equal(fetchCalled, false);
});

test('checkBackendHealth bounds a stalled health request and returns the existing offline shape', async () => {
  const transport = createBackendTransport({
    backendUrl: 'https://api.example.test',
    healthTimeoutMs: 15,
    fetchImpl: async (_url, options) => new Promise((resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
    }),
  });

  assert.deepEqual(await transport.checkBackendHealth(), { reachable: false });
});

test('checkBackendHealth reports backend and Supabase connectivity separately', async () => {
  const transport = createBackendTransport({
    backendUrl: 'https://api.example.test',
    fetchImpl: async () => response({ supabaseReachable: false }),
  });

  assert.deepEqual(await transport.checkBackendHealth(), {
    reachable: true,
    supabaseReachable: false,
  });
});
