# Status privacy bulk controls — frontend 1.2.102

- Added bulk exclude/allow actions in the Status privacy contact picker. Actions apply to the current search-filtered contacts, not silently to the entire address book when a search is active.
- The change planner deduplicates contacts, ignores invalid IDs, and only sends changes needed to reach the requested state.
- Updates run sequentially and refresh the saved exclusion list afterward. Partial failures are reported honestly so users can review and retry remaining changes.
- Added unit coverage for planning and UI wiring.

## Verification scope

Local unit tests and release audit only. No production deployment, live Supabase mutation, Expo device build, or hosted integration test was performed.
