// Local, deterministic search over messages already loaded by the chat screen.
// Search never requests additional data, so it cannot widen authorization scope.
export function searchMessages(messages, query) {
  const needle = String(query || '').trim().toLocaleLowerCase();
  if (!needle) return [];
  return (messages || [])
    .filter((message) => {
      if (!message || message.deletedAt) return false;
      const haystack = [message.text, message.mediaName, message.replyPreview]
        .filter((value) => typeof value === 'string')
        .join(' ')
        .toLocaleLowerCase();
      return haystack.includes(needle);
    })
    .map((message) => ({ id: message.id }));
}
