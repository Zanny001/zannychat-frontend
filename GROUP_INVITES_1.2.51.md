# Group invites — frontend 1.2.51 / backend 1.2.5

- Group admins can create an invite link from Group members. Raw invite tokens are returned once and only a SHA-256 hash is stored.
- Invites default to seven days and up to 25 new members; backend bounds expiry to 1–168 hours and uses to 1–100.
- Authenticated users can paste a token from Profile → Join a group. Acceptance is performed by a database function that locks the invite row, checks revocation/expiry/use limits, inserts membership, and increments usage atomically.
- Admins can revoke active invite rows through the backend endpoint. The current UI exposes creation/sharing and revocation for the latest invite generated in the current screen session; it does not list historical active invites.
- Deep links use the existing `zannychat://` scheme. The existing `zannychat://` scheme routes invite links to the Join a group screen; paste-token entry remains a fallback.

Migration `0020_group_invites.sql` must be applied before backend deployment. This source increment has not been deployed or tested against the hosted Supabase database or physical devices.
