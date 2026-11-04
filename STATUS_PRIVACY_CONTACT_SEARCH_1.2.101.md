# ZannyChat frontend 1.2.101 — Status privacy contact search

- Added a search field to the Status privacy exclusion picker.
- Filters contacts by display name or account ID, case-insensitively and with partial matching.
- Preserves the existing exclusion toggle behavior and explains when a search has no matches.
- Added unit tests for empty queries, partial/case-insensitive name matching, ID matching, and defensive input handling.

## Verification

Run `npm run test:unit` and `npm run audit:release` from the frontend directory. This is a source-only change; it does not deploy the app or modify the hosted database.
