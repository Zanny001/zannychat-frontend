# ZannyChat 1.2.42 — persistent text-message outbox

- Failed text sends are retained in device-local AsyncStorage, scoped to account and conversation.
- The chat displays a pending-message count and a manual retry action.
- Each pending item retains its request ID and reply target, so retry uses the same message primary key and can recover an insert that committed before a response was lost.
- The outbox is bounded to the most recent 50 items per conversation. It does not automatically transmit in the background.
- Attachments are not queued because their upload lifecycle and local-file availability need a separate safe implementation.
- Pending text may contain private conversation content and is stored locally on-device. It is not end-to-end encrypted by this feature and does not sync across devices.

## Verification

- Frontend unit tests: 54 passed.
- Frontend release audit: 11/11 checks passed.
- These checks do not replace Expo build/device testing or production verification.
