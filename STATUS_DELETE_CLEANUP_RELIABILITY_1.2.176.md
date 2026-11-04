# Status deletion cleanup reliability — 1.2.176

- Status deletion still requires an authenticated owner-scoped row lookup.
- Validated media is removed before the status row. If storage removal fails, deletion aborts and the row remains available for a retry instead of silently leaving an orphaned object.
- Unsafe legacy media paths are never passed to storage deletion.
- Added regression tests for ownership scoping, validation, and storage-failure ordering.

This is a source-only change. Production build, live Supabase behavior, and deployment have not been verified.
