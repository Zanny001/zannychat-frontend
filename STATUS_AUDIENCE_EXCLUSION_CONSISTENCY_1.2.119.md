# Status audience exclusion consistency — frontend 1.2.119

## Change
- The selected-contact audience picker now loads current contact exclusions alongside the contact list.
- Excluded contacts are visibly labeled and disabled while choosing a selected audience.
- Bulk “Select matching” only adds eligible contacts; “Clear matching” still removes selections from the current search, including stale selections.
- When a contact is newly excluded, their ID is removed from the in-progress selected audience.
- Opening the picker removes stale selected IDs that are no longer contacts or are currently excluded.
- The server-side exclusion rule remains authoritative; this is a UI consistency safeguard, not a replacement for RLS.

## Validation
- Unit suite: 195 passed, 0 failed.
- Frontend release audit: 12/12 passed.
- Selected-audience migration static tests: 3 passed, 0 failed.
- JSX parser check completed with TypeScript's JSX parser/transpiler.

## Limitations
- No live Supabase migration was applied and no production deployment was performed.
- Physical-device and production Expo builds remain outstanding.
