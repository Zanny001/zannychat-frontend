# ZannyChat 1.2.164 — Attachment Metadata Hardening

This source release hardens the local attachment retry queue by retaining only expected fields from persisted records and applying strict bounds to optional metadata.

## Changes
- Explicit allowlist for normalized attachment records, preventing arbitrary stored properties from propagating into UI and retry operations.
- Bounded file names, MIME types, captions, file sizes, voice durations, and retry diagnostics.
- Rejects attachment IDs and URIs containing control characters.
- Preserves queue size limits, duplicate-ID handling, and timestamp normalization.
- Added regression tests for metadata sanitization and compatibility with retry metadata.

## Validation
- Automated frontend tests and release audit results are recorded in the release handoff after execution.
- Production build, device testing, backend integration, and deployment are not implied by this source package.
