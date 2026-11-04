/** True only while a response still belongs to the latest issued request. */
export function isLatestRequest(requestId, latestRequestId) {
  return Number.isSafeInteger(requestId) && requestId > 0 && requestId === latestRequestId;
}
