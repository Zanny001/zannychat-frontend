# Status mutes — frontend 1.2.61 / backend 1.2.14

Added per-viewer status muting. Muted authors are removed from the active status list, a status card offers a mute action, and the screen lists muted account IDs with an unmute action. Muting is a personal feed preference and does not block direct messages.

Migration `0028_muted_status_users.sql` creates an RLS-protected per-user preference table and prevents self-muting. Apply after the existing migration sequence. Account IDs are shown in abbreviated form because this increment does not yet resolve contact display names.

Verification: frontend unit tests and release audit plus backend static migration tests; no live Supabase/device validation or production deployment.
