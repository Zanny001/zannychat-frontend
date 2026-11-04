# Release 1.2.171

Status expiry is now enforced server-side for the supported 6, 12, 24 and 48 hour choices. The database sets timestamps using server time and prevents post-publication timestamp edits. This fixes the mismatch where the frontend offered 48 hours while earlier database constraints capped Status lifetime at 24 hours.

This is a source release. Apply migration `0046_server_enforced_status_expiry.sql` only after staging validation; no live migration or deployment was performed as part of this package.
