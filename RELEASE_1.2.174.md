# Release 1.2.174

## Fix
Expired Status media cleanup now fetches the owner ID required by its fail-closed path validator. This restores deletion of valid expired media objects while preserving owner and status-path isolation. A regression test ensures the query does not regress to omitting `user_id`.

## Validation
See release handoff for actual test, audit, and archive results. This release has not been deployed to production.
