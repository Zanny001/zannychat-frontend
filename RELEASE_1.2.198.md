# ZannyChat 1.2.198

## Channel privacy and state isolation
- Clear channel-specific privileged state (moderators, invites, reports) when a selected channel disappears from the refreshed directory.
- Clear channel posts, comments, comment drafts, pagination cursors, moderation panels, and edit drafts when a selected channel is removed or deleted.
- Add regression tests to prevent stale channel-scoped data from persisting after channel removal.

## Verification scope
- Automated frontend utility tests and release audit; backend regression suite.
- This release has not been deployed to production. Automated source tests do not replace device, staging, or live database validation.
