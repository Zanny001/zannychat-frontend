# ZannyChat Release 1.2.197 — stale status refresh protection

## Changes
- Status refreshes now carry a monotonically increasing request ID.
- Only the latest refresh may update statuses, reactions, muted users, exclusions, profile-name lookups, error state, or loading state.
- This prevents slow responses from an earlier focus/realtime refresh from overwriting a newer feed response.
- Added a reusable latest-request guard and unit tests for current, stale, and invalid request IDs.
- Frontend version: 1.2.197. Backend package version remains unchanged. No database migration is required.

## Verification
- Frontend utility tests: 344 passed, 0 failed.
- Backend regression tests: 173 passed, 0 failed.
- Frontend release audit: 12/12 passed.
- Version manifests and ZIP integrity checked after packaging.

## Deployment notes
Not deployed to production. No migration is required. Test repeated status refreshes, app foregrounding, and realtime updates on staging before rollout.
