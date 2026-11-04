# ZannyChat upgrade pass 1.2.124

## Implemented
- Channel post publishing now persists its idempotency key before the request. Retrying after a network timeout or app restart reuses the same key for the same normalized post body.
- Changing the body creates a new key.
- Successful requests are marked complete before best-effort cleanup, preventing a failed local cleanup from accidentally reusing a completed key for a future identical post.
- Added regression tests for persistence across restart, changed-body behavior, completion cleanup, invalid inputs, and composer integration.

## Checks
- `npm run test:unit`: 204 passed, 0 failed.
- Release hygiene audit: 12/12 passed.
- Backend selected-audience/channel migration static regression checks: 8 passed, 0 failed.

## Production status
Source-only. No production services or live Supabase data were changed. Production deploy and smoke tests remain outstanding.
