# Frontend 1.2.172 — migration release safety

- Corrected the duplicate Supabase migration version prefix by renumbering `0046_channel_post_idempotency.sql` to `0048_channel_post_idempotency.sql` (after the existing `0047_server_generated_delivery_receipt_timestamps.sql`).
- Updated the channel idempotency migration regression test to use the corrected filename.
- Added a backend regression test that rejects duplicate or malformed migration version prefixes.
- Bumped frontend version to 1.2.172 and backend version to 1.2.47.

This is a source package only. Review the hosted migration history and staging database before applying the renamed migration; do not blindly rerun a migration already recorded as applied.
