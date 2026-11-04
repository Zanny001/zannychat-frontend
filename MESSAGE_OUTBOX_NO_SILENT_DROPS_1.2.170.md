# ZannyChat frontend 1.2.170 — no silent message-outbox drops

- Changed recovery normalization of oversized persisted message queues to preserve the oldest pending sends, rather than evicting them in favor of newer entries.
- New messages are rejected from local queue persistence when the 50-item outbox is full; the save path returns `false` instead of claiming the message was queued when it was not retained.
- Re-saving an existing request ID remains supported, preserving idempotent retry behavior.
- Added regression coverage for oldest-first retention and the full-queue refusal guard.

This is a source-only change. No hosted deployment or live data migration was performed. The caller/UI should surface a clear “pending queue full” state when `savePendingMessage` returns `false`; this release does not claim that every caller already does so.
