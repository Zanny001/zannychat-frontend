# ZannyChat 1.2.53 — private photo statuses

Adds photo status publishing alongside existing text statuses. Photos are limited to 10 MB and JPEG/PNG/WebP, stored in a private `status-media` bucket, and displayed via short-lived signed URLs. Database/storage policies restrict uploads to the author and reads to the author or eligible conversation contacts. Photo statuses expire within the existing 24-hour window. Deleting a status also attempts to remove its media object.

Migration required: backend `supabase/migrations/0022_status_media.sql`.

This increment does not include video statuses, audience exclusions/mute lists, viewer receipts, reactions/replies, realtime status updates, or scheduled cleanup of expired storage objects. The current UI is limited to photo selection from the device library. Validate signed URL refresh, RLS/storage policy behavior, upload failure cleanup, and physical-device media permissions before production rollout.
