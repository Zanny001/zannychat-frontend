# ZannyChat 1.2.165 — Attachment Recovery Path Isolation

- Replaced lossy identifier sanitization in attachment recovery filenames with percent-encoding.
- Distinguishes identifiers such as `user/1` and `user_1`, preventing recovery copies from overwriting each other.
- Rejects missing, control-character-containing, or oversized identifiers before attempting a recovery copy.
- Added regression tests for path collisions and invalid identifiers.

This is a source-only release. Production build, device testing, backend integration, and deployment remain outstanding.
