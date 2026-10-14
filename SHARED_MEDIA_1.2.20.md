# Shared Media Hub — 1.2.20

## Included
- Added a conversation-level Shared media screen accessible from the chat overflow menu.
- Added Photos, Files, and Links tabs with premium glass-card styling, counts, empty/loading/error states, retry, and bounded older-history pagination.
- Image attachments open in an in-app full-screen preview; files and voice notes are opened via the platform URL handler.
- Shared links are extracted from message text, deduplicated, and restricted to HTTP(S) URLs without embedded credentials.
- Deleted messages are excluded. Attachment links are the existing short-lived signed URLs returned by the API; this feature does not change storage authorization.
- Added pure utility tests for link safety and shared-content classification.

## Limitations
- The screen indexes only messages fetched during this screen session; the user can load older pages in bounded batches.
- File playback/download behavior depends on platform handlers. No native media player was added.
- This release does not include pinning or server-side media indexing.
