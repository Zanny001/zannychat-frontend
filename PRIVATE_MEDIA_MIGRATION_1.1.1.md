# ZannyChat frontend 1.1.2 — private chat media

## Changes

- New chat uploads store a `storage://chat-media/<object-path>` marker rather than a public object URL.
- Message reads and realtime inserts exchange that marker (and legacy public URLs) for short-lived signed URLs.
- If signing fails, the media URL is set to `null`; text messages and the rest of the history still load.
- Avatar storage remains public by design; this migration only privatizes `chat-media`.

## Deployment order

1. Deploy the frontend build containing this change, or coordinate the migration and frontend release in a maintenance window.
2. Apply backend migration `0009_private_chat_media.sql` after migrations `0001`–`0008`. The migration converts existing stored public URLs to storage markers and sets the bucket private.
3. Test signed image, file, and voice URLs with two participants, a nonparticipant, and a signed-out client.

Do not make `chat-media` private before compatible clients are available: older app versions will keep storing and rendering public URLs and cannot refresh signed URLs. Existing public URLs already shared outside the app cannot be revoked from third parties that have copied/downloaded the files.

## Validation status

Static checks only; device-level Expo tests and a real Supabase Storage/RLS test remain required.


## 1.1.2 parser hardening

- Legacy media URLs are accepted only from the configured Supabase project origin.
- Storage object paths reject absolute paths, empty path segments, dot segments, and backslashes before requesting a signed URL.
- This prevents third-party URLs that merely resemble Supabase Storage URLs from being interpreted as local bucket objects.
