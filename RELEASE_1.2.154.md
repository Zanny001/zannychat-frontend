# ZannyChat 1.2.154 — Group Management Race Safety

## Implemented
- Added generation-based request guards to group-management refreshes.
- Stale member, current-user, metadata, and invite responses are ignored when a newer refresh starts or the screen loses focus.
- Invite response data is checked to ensure it is an array before applying it to UI state.
- Added automated source-contract regression tests for stale refresh and invite-list handling.

## Verification performed
- Frontend utility tests: 275 passed, 0 failed.
- Frontend release audit: 12/12 passed.
- ZIP archive integrity: validated after packaging.

## Not included in this verification
- Full Expo production build.
- Physical-device and live backend integration tests.
- Independent security review or production deployment.

This is a source-only release. Backend authorization remains authoritative for all group administration operations.
