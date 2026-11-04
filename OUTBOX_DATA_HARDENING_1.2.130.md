# ZannyChat 1.2.130 — persisted message outbox hardening

- Normalize locally persisted outbox records before retry processing.
- Reject malformed entries and invalid/oversized request IDs.
- Bound message text, retry counters, diagnostic strings, and queue length.
- Keep only the newest 50 valid queued messages when repairing oversized or malformed storage.
- Preserve the existing per-conversation serialized read/modify/write behavior.

This is client-side resilience, not a replacement for server-side authorization or idempotency. It does not change the production deployment.
