import { supabase, SUPABASE_ENABLED } from './supabaseClient';
import { debugLog } from '../utils/diagnostics';
import { withTimeout } from '../utils/withTimeout';

// Backend access is opt-in. A fresh checkout with no .env stays in mock
// mode and never contacts a shared hosted backend by accident.
const BACKEND_URL = (process.env.EXPO_PUBLIC_BACKEND_URL || '').replace(/\/$/, '');

export const BACKEND_ENABLED = Boolean(BACKEND_URL);
const DEFAULT_BACKEND_REQUEST_TIMEOUT_MS = 20000;
const SESSION_RESTORE_TIMEOUT_MS = 8000;
const BACKEND_HEALTH_TIMEOUT_MS = 5000;

// Calls the backend with the current Supabase session's access token
// attached, so requireAuth on the server can verify who's asking.
// The timeout includes session lookup, fetch and response JSON parsing.
// Callers may override timeoutMs or pass an AbortSignal in options.
export async function backendFetch(path, options = {}) {
  const perfStartedAt = Date.now();
  let sessionMs = 0;
  let status = 'no-response';
  const routePath = typeof path === 'string' ? path.split('?')[0] : 'unknown';
  const {
    timeoutMs = DEFAULT_BACKEND_REQUEST_TIMEOUT_MS,
    signal,
    ...requestOptions
  } = options;

  try {
    if (!BACKEND_ENABLED) {
      throw new Error('EXPO_PUBLIC_BACKEND_URL is not set');
    }

    let token;
    if (SUPABASE_ENABLED) {
      const sessionStartedAt = Date.now();
      const { data } = await withTimeout(
        () => supabase.auth.getSession(),
        { timeoutMs: SESSION_RESTORE_TIMEOUT_MS, signal, label: 'Session restoration' },
      );
      sessionMs = Date.now() - sessionStartedAt;
      token = data?.session?.access_token;
    }

    const requestStartedAt = Date.now();
    const { response, body } = await withTimeout(async (requestSignal) => {
      const response = await fetch(`${BACKEND_URL}${path}`, {
        ...requestOptions,
        signal: requestSignal,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(requestOptions.headers || {}),
        },
      });
      const body = await response.json().catch(() => ({}));
      return { response, body };
    }, { timeoutMs, signal, label: `Backend request ${routePath}` });

    status = response.status;

    debugLog('[Perf][backendFetch]', {
      path: routePath,
      sessionMs,
      responseAndBodyMs: Date.now() - requestStartedAt,
      totalMs: Date.now() - perfStartedAt,
      status,
    });

    if (!response.ok) {
      const requestError = new Error(body.error || `Request failed with status ${response.status}`);
      requestError.status = response.status;
      throw requestError;
    }
    return body;
  } catch (error) {
    debugLog('[Perf][backendFetch] failed', {
      path: routePath,
      sessionMs,
      totalMs: Date.now() - perfStartedAt,
      status,
      code: error?.code || error?.name || 'REQUEST_FAILED',
    });
    throw error;
  }
}

// Hits /health directly — no auth token, since that route doesn't
// require one. Used by the Connections panel in Settings to show real
// status instead of just "a URL is set". The complete fetch + JSON read
// is bounded so a stalled service cannot leave the diagnostics UI loading.
export async function checkBackendHealth({ signal, timeoutMs = BACKEND_HEALTH_TIMEOUT_MS } = {}) {
  if (!BACKEND_ENABLED) return null;
  try {
    return await withTimeout(async (requestSignal) => {
      const response = await fetch(`${BACKEND_URL}/health`, { signal: requestSignal });
      if (!response.ok) return { reachable: false };
      const body = await response.json();
      return { reachable: true, ...body };
    }, { timeoutMs, signal, label: 'Backend health check' });
  } catch (err) {
    return { reachable: false };
  }
}
