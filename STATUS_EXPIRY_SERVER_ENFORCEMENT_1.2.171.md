# ZannyChat 1.2.171 — server-enforced Status expiry

## Changes
- Added backend migration `0046_server_enforced_status_expiry.sql`.
- The database now accepts only the app's supported 6-, 12-, 24-, and 48-hour Status lifetimes.
- Insert timestamps are regenerated from database server time; client clocks cannot make a Status appear newer or extend its lifetime by submitting forged timestamps.
- Published `created_at` and `expires_at` values cannot be changed on later updates.
- Updated Status row constraints and write policies to support the existing 48-hour option.
- Added backend regression checks for accepted lifetimes, server timestamps, immutable expiry and row policies.

## Verification
- Frontend unit tests and release audit run for this source package.
- Backend Status expiry migration tests run for this source package.
- Source-only release. Migration has not been applied to live Supabase; production build, full integration testing and deployment remain pending.
