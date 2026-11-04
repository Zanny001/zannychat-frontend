# Frontend 1.2.99 — scheduled-message composer and management

- Added a conversation-scoped “Schedule message” action to the chat overflow menu.
- Added a themed Scheduled Messages screen for composing, listing, refreshing, and cancelling pending scheduled messages.
- The screen uses the authenticated backend API; it does not write to the service-role-only queue directly from the client.
- Validates message text and the supported schedule window (at least one minute and no more than 30 days ahead), and uses the device's local time for entry.
- The screen clearly notes that actual delivery depends on the backend migration and scheduled-message worker being configured and running.
- Added unit tests for date formatting, schedule-window boundaries, invalid values, and message length.
- Source-only increment. No production database migration, Render/Netlify deployment, or live delivery test was performed.
