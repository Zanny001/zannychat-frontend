# ZannyChat 1.2.41 — attachment send recovery

## Changes
- Extended the bounded transient retry and stable request-ID pattern from text messages to photo/file/voice/contact message inserts.
- Added explicit conversation and authenticated-user validation before persisting an attachment message.
- Recovers an already-inserted row after a duplicate-ID response when the original response was ambiguous.

## Validation
- Frontend unit tests: 54 passed.
- Frontend release audit: 11/11 passed.
- API module syntax check passed.

## Limits
This makes message-row creation safer, but does not retry the binary upload itself, implement an offline outbox, or guarantee media delivery if an upload fails before message insertion. Production and physical-device testing remain required.
