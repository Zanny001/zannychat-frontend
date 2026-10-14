/** Helpers for private, on-device conversation drafts. */
export function makeDraftKey(userId, conversationId) {
  if (!userId || !conversationId) return null;
  return `zannychat.draft.v1.${encodeURIComponent(String(userId))}.${encodeURIComponent(String(conversationId))}`;
}

export function normalizeDraftText(value) {
  if (typeof value !== 'string') return '';
  // A draft should be safe to persist and should not grow without bound if
  // someone pastes a huge document into the composer by mistake.
  return value.slice(0, 20000);
}

export function shouldPersistDraft(value) {
  return normalizeDraftText(value).trim().length > 0;
}

export function parseDraftRecord(raw) {
  if (typeof raw !== 'string') return { text: '', updatedAt: null };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.__zannychatDraft === true && typeof parsed.text === 'string') {
      return {
        text: normalizeDraftText(parsed.text),
        updatedAt: typeof parsed.updatedAt === 'string' && !Number.isNaN(Date.parse(parsed.updatedAt)) ? parsed.updatedAt : null,
      };
    }
  } catch (_) {
    // Older releases stored the draft as plain text. Keep those drafts readable.
  }
  return { text: normalizeDraftText(raw), updatedAt: null };
}
