# Channel post reactions — frontend 1.2.68 / backend 1.2.20

Added five supported reactions (👍 ❤️ 😂 😮 👏) to public channel posts. Each signed-in user has at most one reaction per post and can switch or clear it. The channel-post endpoint returns aggregate counts and the current user's reaction. Writes are authenticated, validate the emoji allowlist, verify the post belongs to the requested channel, and are mediated by the service-role backend. Migration `0033_channel_post_reactions.sql` enables RLS, revokes direct client privileges, and cascades reaction deletion with the post.

Verification is source-level only. Apply migration 0033 after 0032 and test with multiple accounts in staging before deployment. No live database changes or deployment were performed.
