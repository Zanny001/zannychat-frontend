/** Build a collision-safe storage key for one user's conversation outbox. */
function encodeKeyPart(value, fallback) {
  const normalized = value == null || String(value) === '' ? fallback : String(value);
  // encodeURIComponent separates delimiter characters such as ':' so IDs
  // containing punctuation cannot alias a different user/conversation pair.
  try {
    return encodeURIComponent(normalized);
  } catch (_) {
    // Lone UTF-16 surrogates are malformed input; replace them deterministically.
    return encodeURIComponent(normalized.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '\uFFFD'));
  }
}

export function getMessageOutboxStorageKey(userId, conversationId) {
  if (conversationId == null || String(conversationId) === '') return null;
  return `zannychat:outbox:v1:${encodeKeyPart(userId, 'guest')}:${encodeKeyPart(conversationId, '')}`;
}
