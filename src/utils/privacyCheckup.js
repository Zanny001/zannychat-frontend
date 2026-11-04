// User-facing privacy checkup. Keep wording aligned with capabilities actually shipped.
export const PRIVACY_CHECKUP_ITEMS = Object.freeze([
  { id: 'sessions', title: 'Review signed-in sessions', detail: 'Check account access and sign out where supported.', action: 'Sessions', icon: 'phone-portrait-outline' },
  { id: 'blocked', title: 'Review blocked accounts', detail: 'Unblock people or confirm your current block list.', action: null, icon: 'person-remove-outline' },
  { id: 'data', title: 'Export your personal data', detail: 'Create a portable copy and choose whether to share it.', action: 'Data export', icon: 'cloud-download-outline' },
  { id: 'encryption', title: 'Understand message protection', detail: 'ZannyChat is not currently end-to-end encrypted. Do not treat chats as a secret vault.', action: null, icon: 'information-circle-outline' },
]);

export function getPrivacyCheckupItems() {
  return PRIVACY_CHECKUP_ITEMS.map((item) => ({ ...item }));
}
