# Message outbox concurrency safety — 1.2.129

## Change

Serialize local message outbox read–modify–write operations by the user/conversation storage key. Saving a pending message, removing a confirmed message, and recording a retry failure now run one at a time for that queue, reducing the chance that overlapping asynchronous storage writes overwrite one another.

## Preserved behavior

- The queue remains scoped by user and conversation.
- Stable request IDs, bounded queue size, retry backoff, and bounded diagnostic fields are preserved.
- Queue operations continue to return `false` on storage failures rather than reporting success.
- This is local-storage consistency protection, not a replacement for server-side idempotency or delivery confirmation.

## Validation

Run `npm run test:unit` and `npm run audit:release`. Full production build and real-device offline/reconnect testing remain release requirements.
