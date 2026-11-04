/** Development-only diagnostics. Never emit identifiers or request paths in production logs. */
export function isDebugLoggingEnabled() {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true;
}

export function debugLog(...args) {
  if (isDebugLoggingEnabled()) console.log(...args);
}
