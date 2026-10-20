/** Retry a transient operation a bounded number of times. Callers should only
 * use this for operations made idempotent by a stable request identifier. */
export function isTransientFailure(error) {
  if (!error) return false;
  const status = Number(error.status || error.statusCode || 0);
  if (status === 408 || status === 425 || status === 429 || status >= 500) return true;
  const code = String(error.code || '').toLowerCase();
  if (['fetch_error', 'network_error', 'econnreset', 'etimedout', 'eai_again'].includes(code)) return true;
  const message = String(error.message || '').toLowerCase();
  return /network request failed|failed to fetch|connection reset|timed? out|temporarily unavailable/.test(message);
}

export async function retryTransient(operation, { attempts = 2, delay = 250, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  const maxAttempts = Math.max(1, Math.min(4, Math.floor(Number(attempts) || 1)));
  let lastError;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts - 1 || !isTransientFailure(error)) throw error;
      await sleep(Math.max(0, Number(delay) || 0) * (attempt + 1));
    }
  }
  throw lastError;
}
