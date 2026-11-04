# ZannyChat 1.2.175 — Status media path validation

- Added a shared validator for status storage keys, binding owner ID, status row ID, media kind and the permitted filename/extension.
- Active-status listing refuses to mint a signed URL for a malformed or cross-row path.
- Media URL refresh rejects unsafe paths before asking storage for a signed URL.
- Status deletion now requires an authenticated owner, scopes the row lookup/deletion to that owner, and removes storage only when the row's path passes validation.
- Added regression tests for valid photo/video keys, cross-owner and cross-row paths, malformed paths, pending uploads, and media-kind mismatches.

This is a source-only change. Supabase policies remain the server-side security boundary; no production deployment or live database change is implied.
