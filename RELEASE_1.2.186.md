# ZannyChat 1.2.186

## Scheduled timestamp validation consistency

- Corrected frontend timezone-offset validation to reject offsets beyond ISO-8601's ±14:00 limit.
- Corrected Gregorian leap-year validation for century years and years below 0100 in frontend and backend validation.
- Added regression tests for boundary offsets and leap-year edge cases.

## Deployment status

Source package only. No live frontend, backend, or Supabase database changes were made.
