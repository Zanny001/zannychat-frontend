# ZannyChat Video Stories — frontend 1.2.59 / backend 1.2.13

- Added MP4 video status selection and playback using Expo Video.
- Video Stories accept MP4 only, capped at 50 MiB and 30 seconds in the picker; captions remain limited to the existing 700-character status limit.
- Video files use the existing private `status-media` bucket and short-lived signed URLs. Audience and expiry are preserved from existing status rules.
- Migration `0027_video_statuses.sql` updates the private bucket's MIME/size restrictions, expands status row constraints and owner update policy, and retains authenticated owner/contact access checks for private storage.
- The video upload path is fixed to `<user-id>/<status-id>/video.mp4`; arbitrary object paths are not accepted by the new policy.
- Apply migration 0027 after migrations 0022–0026. Validate Storage RLS with separate owner, shared-conversation contact, unrelated account, and expired-status cases before rollout.
- Not implemented: video transcoding/compression, background upload/resume, thumbnails, server-scheduled cleanup, contact exclusions/mute lists, and hosted/device integration testing.

Verification is limited to source-level tests and static migration checks unless separately documented. No production migration or deployment was performed.
- Build note: the package registry was unavailable long enough that the lockfile dependency graph could not be regenerated here. Run `npx expo install expo-video` (or `npm install` to refresh `package-lock.json`) before using `npm ci` or producing a release build, then run an Expo native build/device smoke test.
