# Group announcement mode — frontend 1.2.82 / backend 1.2.34

Group admins can enable announcement mode from Group Management. When enabled, only admins can send messages; existing members retain read access. The setting is persisted on `conversations.admin_only_messages` and is enforced by the Supabase `messages` INSERT RLS policy, not merely by hiding the composer. Direct chats and groups with the setting off retain their previous send behavior.

## Database
Apply `0040_group_announcement_mode.sql` after earlier migrations. Existing conversations default to `false`. The migration adds a private `SECURITY DEFINER` membership/admin helper with a pinned search path and replaces the message-insert policy while preserving sender identity, membership, and block checks.

## Validation and limitations
Static migration/route regression tests and local frontend checks are included. This has not been applied to hosted Supabase or tested with two live accounts. Verify the project's actual role grants and RLS behavior in staging before production use.
