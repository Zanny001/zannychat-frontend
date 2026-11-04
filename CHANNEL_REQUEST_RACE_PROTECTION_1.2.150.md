# Channel Request Race Protection — 1.2.150

## Changes
- Channel list refreshes now ignore stale responses when a newer search/refresh has started or the search query changes.
- Loading and error state updates are scoped to the current request so late failures do not overwrite current UI state.
- Opening a channel uses a request sequence guard so a slower earlier channel response cannot replace the channel most recently selected.
- Moderator and invite results are applied only for the still-current request, and malformed list responses fall back to empty arrays.
- Added unit tests for latest-request and current-query guard behavior.

## Validation
- Run `node --experimental-default-type=module --test src/utils/*.test.js`.
- Run `python3 scripts/audit_frontend_release.py`.
- Native/device behavior and production integration still require separate validation.
