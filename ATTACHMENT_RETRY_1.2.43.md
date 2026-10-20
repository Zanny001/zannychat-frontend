# ZannyChat 1.2.43 — attachment upload retry queue

- Failed upload attempts for images, picked files, and voice notes are stored in a device-local queue scoped to the signed-in account and conversation.
- The chat shows a retry control and retries upload before attempting to create a message record.
- Queue size is capped at 20 items per conversation. Queue records retain the original local URI and relevant metadata; if the OS clears the cache or the file is moved, the retry can fail and the user may need to select the file again.
- Queue records are removed before inserting the message row. This avoids blindly re-sending a message if the database insert result is uncertain, but means a message-insert failure after a successful upload requires manual checking and may leave an orphaned storage object.
- Attachment payloads remain local metadata only until upload. This feature is not background transfer, cross-device sync, or end-to-end encryption.

## Verification

- Unit test suite includes structural tests for queue bounds, supported media kinds, and account/conversation scoping.
- Release audit and test results are recorded in the delivery summary. Expo build/device and production checks remain required.
