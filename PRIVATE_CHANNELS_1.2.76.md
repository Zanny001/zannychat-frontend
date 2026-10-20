# Private Channels — v1.2.76

- Create channels as public or private; owners can change visibility in channel settings.
- Private channels are not shown in discovery for non-members. Joined private channels are labeled in the list and detail screen.
- Owners can create a bounded, expiring invitation and share its token through the platform share sheet. Invitees paste the token into the Join a private channel panel.
- Invitation tokens are single-display secrets: the API stores only a SHA-256 hash and returns the raw token only at creation.
- The backend migration `0038_private_channels_and_invites.sql` is required before enabling this feature on a deployed environment.
