# Scheduled-message worker batch configuration — 1.2.183

The scheduled-message worker now supports `SCHEDULED_MESSAGES_BATCH_SIZE` to tune how many due messages one worker invocation asks the database function to process.

- Default: `100` messages per invocation.
- Accepted override: a safe integer from `1` through `500`.
- Missing, malformed, fractional, non-finite, zero, negative, or over-limit values fall back to `100`.
- The database function continues to claim due rows atomically with its existing `FOR UPDATE SKIP LOCKED` behavior; this setting changes the bounded batch size, not authorization or delivery semantics.

Set the environment variable in the worker's deployment environment only after measuring database capacity. This source release does not change any live deployment configuration.
