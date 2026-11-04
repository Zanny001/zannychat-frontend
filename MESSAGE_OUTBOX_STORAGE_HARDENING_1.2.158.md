# Message Outbox Storage Hardening — 1.2.158

- Normalize persisted message queue data during removal and retry-failure updates.
- Prevent malformed and duplicate legacy records from being re-written by mutation paths.
- Remove the persisted queue key when a retry update leaves no valid entries.
- Added regression coverage for normalization on mutation paths.

This is client-side queue integrity work; server-side idempotency and production integration still require independent verification.
