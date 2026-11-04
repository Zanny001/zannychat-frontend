# Attachment Outbox Metadata Hardening — 1.2.164

- Replaced broad object spreading in persisted attachment normalization with an explicit field allowlist.
- Bounded attachment names, MIME types, captions, sizes, and voice durations.
- Rejects attachment URIs and IDs containing control characters while preserving platform URI schemes such as `file://` and `content://`.
- Strips control characters from saved retry error diagnostics and retains existing queue size, duplicate-ID, and timestamp protections.
- Added regression tests for unexpected persisted properties, metadata limits, control characters, retry metadata, and duplicate IDs.

This is client-side persisted-data hardening; it does not replace backend authorization or upload validation.
