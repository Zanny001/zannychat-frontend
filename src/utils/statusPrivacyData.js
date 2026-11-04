/** Fail closed when privacy metadata cannot be loaded. Client-side checks are defense in depth;
 * Supabase RLS remains the authorization boundary. */
export function assertStatusPrivacyDataAvailable({ recipientError, mutedError, excludedError } = {}) {
  if (recipientError || mutedError || excludedError) {
    throw new Error('Could not verify status privacy settings. Refresh and try again.');
  }
}
