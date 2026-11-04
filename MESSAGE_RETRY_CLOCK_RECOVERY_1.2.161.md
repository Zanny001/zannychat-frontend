# Message Retry Clock Recovery — 1.2.161

- Prevents queued messages from becoming indefinitely ineligible for retry when a device clock change leaves `lastAttemptAt` in the future.
- A future retry timestamp is treated as stale. The next recorded failure refreshes the timestamp and returns the message to bounded exponential backoff.
- Adds regression coverage for the future-timestamp guard.

This is client-side recovery only. Server-side idempotency remains necessary to prevent duplicate delivery across retries.
