/** Convert database/network failures into user-safe messaging without leaking raw backend details. */
export function getSafeMessageSendError(error) {
  const code = typeof error?.code === 'string' ? error.code : '';
  if (code === '42501') {
    return 'You may no longer have permission to send messages in this conversation.';
  }
  if (code === '23503') {
    return 'This conversation or reply is no longer available. Refresh the chat and try again.';
  }
  if (code === '23514' || code === '22P02' || code === '22023') {
    return 'This message could not be saved because some of its data is invalid.';
  }
  if (!code || /network|fetch|timeout|timed out|offline|connection/i.test(String(error?.message || ''))) {
    return 'Message could not be saved. Check your connection and try again.';
  }
  return 'Message could not be saved. Please try again.';
}
