# Outbox Request Deduplication — 1.2.157

The pending-message normalizer now treats `requestId` as the queue idempotency key. If persisted storage contains multiple valid entries with the same request ID, only the latest valid entry is retained and placed at its latest FIFO position. Invalid duplicate entries do not erase a valid earlier entry. The existing 50-message queue limit and text/metadata bounds remain in force.

This is client-side queue recovery hardening; it does not by itself guarantee server-side exactly-once delivery. The backend should continue to enforce idempotency for message creation.
