# Attachment Outbox Normalization — 1.2.163

- Normalize persisted attachment records on load and before outbox mutations.
- Drop malformed records, unsupported attachment kinds, missing/oversized identifiers, and missing/oversized URIs.
- Canonicalize timestamps, cap retry attempts and diagnostic strings, and clear invalid retry timestamps so they cannot indefinitely delay recovery.
- Deduplicate by attachment ID, retaining the latest valid entry and its latest FIFO position.
- Keep the queue bounded at 20 attachments and remove storage when the normalized queue is empty.
- Added focused regression tests for malformed data, duplicate IDs, queue bounds, and timestamp normalization.

This is client-side queue integrity only; it does not prove upload success, server authorization, or exactly-once delivery.
