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


/** Errors that cannot succeed by retrying the same queued message unchanged. */
export function isPermanentMessageSendError(error) {
  const code = typeof error?.code === 'string' ? error.code : '';
  if ([
    '42501', // RLS / permission denied
    '23503', // missing conversation or reply target
    '23514', // check constraint
    '23502', // not-null constraint
    '22P02', // invalid input representation
    '22023', // invalid parameter
    '23505', // duplicate request ID that could not be recovered
    'AUTH_REQUIRED',
    'AUTH_SESSION_ERROR',
  ].includes(code)) return true;

  const status = Number(error?.status || error?.statusCode || 0);
  if ([400, 401, 403, 404, 413, 415, 422].includes(status)) return true;
  return /not signed in|sign in again|could not verify your sign-in|conversation id is missing|enter a message before sending|no longer have permission|no longer available|invalid/i.test(String(error?.message || ''));
}
