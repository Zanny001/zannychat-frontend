/**
 * Prevents stale asynchronous channel requests from replacing newer UI state.
 * Request IDs should be monotonically increasing within the screen instance.
 */
export function isCurrentChannelRequest(requestId, latestRequestId, requestedQuery, currentQuery) {
  return requestId === latestRequestId && requestedQuery === currentQuery;
}
