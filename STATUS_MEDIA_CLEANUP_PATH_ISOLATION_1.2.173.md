# Status media cleanup path isolation — 1.2.173

- Expired-status cleanup now validates each storage path against the authenticated owner's ID, the specific status row ID, and supported photo/video filename patterns before requesting deletion.
- Pending placeholders, cross-owner paths, cross-row paths, unsupported extensions, traversal-like paths, and malformed metadata are ignored as storage deletion targets.
- Added focused regression tests for owner/path binding and fail-closed behavior.

Validation: frontend utility tests and release audit are run for this source package. This is a source-only change; no live database or hosted service was changed.
