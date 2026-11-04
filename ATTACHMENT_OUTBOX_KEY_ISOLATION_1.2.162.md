# Attachment Outbox Key Isolation — 1.2.162

## Change

Attachment outbox storage keys now encode the user and conversation identifiers independently, matching the collision-resistant approach already used by the text-message outbox. Delimiter-containing IDs can no longer alias another user/conversation pair. Malformed Unicode identifiers are deterministically normalized, and a missing conversation ID returns no storage key.

## Validation

- Added unit tests for delimiter collision resistance, common-ID compatibility, missing conversation IDs, and malformed Unicode.
- Existing attachment outbox queue limits and retry metadata remain unchanged.

## Scope

This is a local-storage isolation improvement. It does not replace server-side authorization or delivery idempotency, and this source release has not been deployed.
