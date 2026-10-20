# ZannyChat 1.2.40 — transient message-send recovery

## Changes
- Added a bounded retry helper for temporary network errors and retryable HTTP/server failures.
- Text-message sends now use a stable client-generated UUID across retry attempts, so a retry cannot create a second row if the original request committed but its response was lost.
- If the database reports a duplicate primary key for that request UUID, the client attempts to recover the already-saved row and return it to the chat.
- Permanent validation/auth/database errors are not blindly retried.

## Validation
- Frontend unit tests: 54 passed.
- Frontend release audit: 11/11 passed.

## Limits
This improves transient recovery for text messages only. It does not create an offline outbox, guarantee delivery while the device is offline, implement per-recipient delivery receipts, or change production services. Runtime verification against the hosted Supabase project and a physical-device build are still required.
