/** Build a fail-closed UI state when contact privacy data cannot be loaded. */
export function getPrivacyLoadFailureState(mode, error) {
  const detail = typeof error?.message === 'string' ? error.message.trim() : '';
  return {
    contacts: [],
    exclusions: [],
    selectedAudienceIds: mode === 'select' ? [] : null,
    error: detail || 'Could not load privacy contacts. Retry before changing your status audience.',
  };
}
