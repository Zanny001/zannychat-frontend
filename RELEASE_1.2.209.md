# ZannyChat Frontend 1.2.209

## Channel moderation report pagination
- Channel owners and moderators can page through open post and comment reports in bounded batches instead of being capped at the first 100 reports.
- Added a Load more reports action with loading state and duplicate-safe appending.
- Report pagination uses a stable `(created_at, id)` cursor and validates cursor values server-side before building database filters.
- No database migration required.

## Verification
- Frontend utility tests: 363 passed.
- Backend tests: 191 passed.
- Frontend release audit: 12/12 passed.
- Production deployment and live database validation were not performed.
