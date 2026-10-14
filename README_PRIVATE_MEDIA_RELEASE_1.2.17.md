# ZannyChat 1.2.17 — personal data portability

- Added a premium-styled **Export your data** screen reachable from Privacy & Security.
- Added paginated export of the authenticated user's profile, conversation memberships, readable message history and local media preferences.
- Attachment files and private storage URLs are excluded from the export; auth/session secrets are never serialized.
- Added pure unit tests for export structure and URL/path omission.
- Added Expo FileSystem and Sharing dependencies for local JSON file creation and user-controlled sharing.

Validation in this environment is limited to dependency-free unit tests, source parsing/static checks, and ZIP integrity. A full Expo install/build and real Supabase export test remain outstanding.
