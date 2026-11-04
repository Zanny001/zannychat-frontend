/** Return status-bar icon color style for the currently resolved app theme. */
export function getStatusBarStyle(resolvedMode) {
  return resolvedMode === 'light' ? 'dark' : 'light';
}
