# Private Channels and Invitation Management — v1.2.77

- Create channels as public or private; owners can change visibility in settings.
- Private channels are hidden from public discovery and server-side membership checks protect posts, reactions, comments, and reports.
- Owners can create bounded-use, expiring invite tokens, share them once through the platform share sheet, list active/revoked/expired invites, and revoke active invitations.
- Invitees paste the token into the Join a private channel panel. The database stores only a SHA-256 token hash.
- Migration `0038_private_channels_and_invites.sql` is required before enabling the feature in a deployed environment.
