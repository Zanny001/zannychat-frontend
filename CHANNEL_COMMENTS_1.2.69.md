# Channel post comments — frontend 1.2.69 / backend 1.2.21

Added subscriber-only channel post comments, author display names, comment creation and deletion, and channel-owner moderation. Comment content is limited to 1,000 characters. The backend verifies post/channel ownership, requires a channel subscription to comment, and permits deletion only by the comment author or channel owner. Migration `0034_channel_post_comments.sql` enables RLS, revokes direct client privileges, and cascades comment cleanup with post/profile deletion.

This is a first discussion slice, not a complete threaded discussion-group system. Comments are flat, capped at the latest 100, and do not yet support replies, reactions, media, reporting, or notification delivery. Apply migration in staging and test with multiple accounts before deployment. No live migration or deployment was performed.
