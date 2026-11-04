/** Retry a transient operation a bounded number of times. Callers should only
 * use this for operations made idempotent by a stable request identifier. */
const MAX_RETRY_AFTER_MS = 30_000;

function firstHeaderValue(value) {
  if (Array.isArray(value)) return value.find((item) => typeof item === 'string' || typeof item === 'number') ?? null;
  return value ?? null;
}

function readRetryAfterHeader(error) {
  const headers = error?.headers;
  if (!headers) return firstHeaderValue(error?.retryAfter ?? error?.retry_after);
  if (typeof headers.get === 'function') {
    return firstHeaderValue(headers.get('retry-after') ?? headers.get('Retry-After') ?? error?.retryAfter);
  }
  const header = headers['retry-after'] ?? headers['Retry-After'] ?? error?.retryAfter ?? error?.retry_after;
  return firstHeaderValue(header);
}

/** Parse RFC-style delta-seconds or an HTTP date, clamped to bounded waits. */
export function getRetryAfterDelayMs(error, now = Date.now(), maxDelay = MAX_RETRY_AFTER_MS) {
  const raw = readRetryAfterHeader(error);
  if (raw == null) return null;
  const value = String(raw).trim();
  if (!value) return null;
  const requestedCap = Number(maxDelay);
  const cap = Number.isFinite(requestedCap)
    ? Math.max(0, Math.min(MAX_RETRY_AFTER_MS, requestedCap))
    : MAX_RETRY_AFTER_MS;
  // Retry-After delta-seconds is a non-negative integer, not arbitrary JS numeric syntax.
  if (/^\d+$/.test(value)) {
    const seconds = Number(value);
    if (!Number.isFinite(seconds)) return cap;
    return Math.max(0, Math.min(cap, seconds * 1000));
  }
  // Avoid permissive Date.parse coercions such as '-2' or '1.5' into calendar dates.
  if (!/^[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(value)) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  const currentTime = Number(now);
  if (!Number.isFinite(currentTime)) return null;
  return Math.max(0, Math.min(cap, timestamp - currentTime));
}

export function isTransientFailure(error) {
  if (!error) return false;
  const status = Number(error.status || error.statusCode || 0);
  if (status === 408 || status === 425 || status === 429 || (status >= 500 && status <= 599)) return true;
  const code = String(error.code || '').toLowerCase();
  if (['fetch_error', 'network_error', 'econnreset', 'etimedout', 'eai_again'].includes(code)) return true;
  const message = String(error.message || '').toLowerCase();
  return /network request failed|failed to fetch|connection reset|timed? out|temporarily unavailable/.test(message);
}

export async function retryTransient(operation, { attempts = 2, delay = 250, maxDelay = MAX_RETRY_AFTER_MS, now = () => Date.now(), sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  const maxAttempts = Math.max(1, Math.min(4, Math.floor(Number(attempts) || 1)));
  let lastError;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts - 1 || !isTransientFailure(error)) throw error;
      const serverDelay = getRetryAfterDelayMs(error, now(), maxDelay);
      const fallbackDelay = Math.max(0, Number(delay) || 0) * (attempt + 1);
      await sleep(serverDelay == null ? Math.min(MAX_RETRY_AFTER_MS, fallbackDelay) : serverDelay);
    }
  }
  throw lastError;
}
