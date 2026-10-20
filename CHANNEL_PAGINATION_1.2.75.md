# ZannyChat channel pagination — v1.2.75 / backend v1.2.27

## Changes
- Channel post endpoint supports `beforeCreatedAt` and `beforeId` cursor parameters.
- Cursor is validated and uses a stable timestamp + UUID tie-breaker.
- Backend returns up to 100 posts plus `hasMore` and `nextCursor` metadata.
- Frontend adds a Load older posts control, merges pages by post ID, and maintains pinned-first display order.
- No database migration is required.

## Verification
- Frontend unit tests: 87 passed.
- Frontend release audit: 12/12 passed.
- Targeted backend channel regression tests: 11 passed.
- Backend route syntax check: passed.

## Remaining validation
- Live Supabase/API pagination test and query-plan performance.
- Concurrent insert/delete edge cases and equal-timestamp boundary verification against actual PostgREST behavior.
- Native app build, physical-device test, and production deployment.
