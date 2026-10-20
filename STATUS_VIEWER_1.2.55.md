# Status viewer and accurate view receipts — 1.2.55

- Added a dedicated modal viewer for active text/photo statuses.
- View receipts are now recorded only when a user opens a status, not merely when the list loads.
- Repeated opens are idempotent via the status/viewer primary key.
- View receipts can be written only for active contact-visible statuses shared through a conversation; only the status owner can read receipts.
- Video Stories, viewer identity list, contact exclusions, replies/reactions, and scheduled expired-media cleanup remain open work.

Apply migration `0023_status_view_receipts.sql` after `0022_status_media.sql`. Validate against a staging Supabase project before production rollout.
