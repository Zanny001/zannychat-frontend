const DEFAULT_TIMEOUT_MS = 15000;

function createAbortError(reason) {
  if (reason instanceof Error) return reason;
  const error = new Error(typeof reason === 'string' ? reason : 'The operation was aborted.');
  error.name = 'AbortError';
  return error;
}

/**
 * Run an async operation with a bounded lifetime and an AbortSignal.
 * The operation receives a signal and should pass it to fetch or another
 * cancellable API. The timeout covers the entire returned promise, including
 * response-body parsing when that work is performed inside the operation.
 */
export async function withTimeout(operation, {
  timeoutMs = DEFAULT_TIMEOUT_MS,
  signal,
  label = 'Request',
} = {}) {
  if (typeof operation !== 'function') {
    throw new TypeError('withTimeout requires an operation function.');
  }
  if (signal?.aborted) throw createAbortError(signal.reason);

  const duration = Number.isFinite(timeoutMs) && timeoutMs > 0
    ? timeoutMs
    : DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  let timeoutId;
  let abortListener;

  const operationPromise = Promise.resolve().then(() => operation(controller.signal));
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error(`${label} timed out after ${duration}ms.`);
      error.name = 'TimeoutError';
      error.code = 'ETIMEDOUT';
      error.timeoutMs = duration;
      controller.abort(error);
      reject(error);
    }, duration);
  });

  let externalAbortPromise = null;
  if (signal) {
    externalAbortPromise = new Promise((_, reject) => {
      abortListener = () => {
        const error = createAbortError(signal.reason);
        controller.abort(error);
        reject(error);
      };
      signal.addEventListener('abort', abortListener, { once: true });
      if (signal.aborted) abortListener();
    });
  }

  try {
    return await Promise.race([
      operationPromise,
      timeoutPromise,
      ...(externalAbortPromise ? [externalAbortPromise] : []),
    ]);
  } finally {
    clearTimeout(timeoutId);
    if (abortListener) signal.removeEventListener('abort', abortListener);
  }
}
