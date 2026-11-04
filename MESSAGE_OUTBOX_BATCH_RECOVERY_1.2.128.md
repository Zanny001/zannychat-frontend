# Message outbox batch recovery — 1.2.128

## Change

Automatic text-message recovery now retries at most five due messages per pass, oldest first. Remaining eligible messages are picked up by the existing focus/foreground/15-second retry scheduler. This prevents a large offline backlog from monopolizing a chat screen or creating a burst of sequential network requests when connectivity returns.

## Preserved behavior

- Stable request IDs continue to be reused for idempotent retries.
- Existing exponential backoff and retry diagnostics remain in place.
- Background retries do not show repeated alert dialogs.
- Messages are removed from the local outbox only after the send endpoint confirms success.

## Validation

Source-level regression checks verify the bounded batch and oldest-first ordering. A production release still requires dependency installation, full frontend tests/build, and real-device/offline-network validation.
