import { withTimeout } from '../utils/withTimeout.js';

const DEFAULT_BACKEND_REQUEST_TIMEOUT_MS = 20000;
const SESSION_RESTORE_TIMEOUT_MS = 8000;
const BACKEND_HEALTH_TIMEOUT_MS = 5000;

/**
 * Create the authenticated HTTP boundary used by frontend domain services.
 * Dependencies are injected so request lifecycle, auth propagation and
 * health behavior can be integration-tested without importing native modules.
 */
export function createBackendTransport({
  backendUrl = '',
  supabase = null,
  supabaseEnabled = false,
  fetchImpl = (...args) => fetch(...args),
  debugLog = () => {},
  defaultRequestTimeoutMs = DEFAULT_BACKEND_REQUEST_TIMEOUT_MS,
  sessionRestoreTimeoutMs = SESSION_RESTORE_TIMEOUT_MS,
  healthTimeoutMs = BACKEND_HEALTH_TIMEOUT_MS,
} = {}) {
  const baseUrl = typeof backendUrl === 'string' ? backendUrl.replace(/\/$/, '') : '';
  const enabled = Boolean(baseUrl);

  async function backendFetch(path, options = {}) {
    const perfStartedAt = Date.now();
    let sessionMs = 0;
    let status = 'no-response';
    const routePath = typeof path === 'string' ? path.split('?')[0] : 'unknown';
    const {
      timeoutMs = defaultRequestTimeoutMs,
      signal,
      ...requestOptions
    } = options;

    try {
      if (!enabled) throw new Error('EXPO_PUBLIC_BACKEND_URL is not set');

      let token;
      if (supabaseEnabled) {
        const sessionStartedAt = Date.now();
        const { data } = await withTimeout(
          () => supabase.auth.getSession(),
          { timeoutMs: sessionRestoreTimeoutMs, signal, label: 'Session restoration' },
        );
        sessionMs = Date.now() - sessionStartedAt;
        token = data?.session?.access_token;
      }

      const requestStartedAt = Date.now();
      const { response, body } = await withTimeout(async (requestSignal) => {
        const response = await fetchImpl(`${baseUrl}${path}`, {
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

  async function checkBackendHealth({ signal, timeoutMs = healthTimeoutMs } = {}) {
    if (!enabled) return null;
    try {
      return await withTimeout(async (requestSignal) => {
        const response = await fetchImpl(`${baseUrl}/health`, { signal: requestSignal });
        if (!response.ok) return { reachable: false };
        const body = await response.json();
        return { reachable: true, ...body };
      }, { timeoutMs, signal, label: 'Backend health check' });
    } catch (_) {
      return { reachable: false };
    }
  }

  return { backendFetch, checkBackendHealth, enabled };
}
