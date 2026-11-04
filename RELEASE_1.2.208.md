# ZannyChat frontend 1.2.208

- Added report controls to other users' channel comments with the same moderation reasons used for channel posts.
- Comment reports flow into the existing channel owner/moderator review queue and are clearly labeled as comment reports.
- Added frontend regression tests for the comment-report API and moderation UI.
- Requires backend 1.2.57 and Supabase migration `0056_channel_comment_reports.sql`.
