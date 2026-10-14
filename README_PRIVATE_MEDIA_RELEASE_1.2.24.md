# ZannyChat 1.2.24 — Pinned-message deep links

## What changed

- Pinned-message bookmarks now retain only safe conversation routing metadata (conversation ID, group flag, display name, and minimal participant ID/name).
- The pinned-message hub's **Open original message** action opens the corresponding conversation and requests the bookmarked message.
- Chat history attempts a bounded search through up to eight older pages, scrolls to the target when found, and uses the existing message highlight treatment.
- Missing/deleted/very old targets produce a clear message instead of silently pretending navigation succeeded.
- A regression test ensures conversation metadata is minimized and no attachment URL or arbitrary participant fields are persisted.

## Privacy and behavior

Pins remain device-local AsyncStorage bookmarks. This is not shared/server-side pinning and AsyncStorage is not independently encrypted. The pin record never stores signed attachment URLs, raw file paths, auth tokens, or complete conversation objects. Target lookup is limited to eight older pages to avoid unexpectedly downloading an entire long conversation.

## Validation

- Frontend utility unit tests: see `FRONTEND_UNIT_TESTS_1.2.24.txt`.
- Frontend JS/JSX syntax parse: see `FRONTEND_PARSE_1.2.24.txt`.
- Backend syntax check: see `BACKEND_SYNTAX_1.2.24.txt`.
- Release checks: see `STATIC_VERIFICATION_1.2.24.txt`.
- Archive integrity and checksum: see `ZIP_INTEGRITY_1.2.24.txt` and `zannychat-sha256-v1.2.24.txt`.

Expo native builds, backend Jest execution, live Supabase migrations/RLS, production auth recovery delivery, and physical-device validation have not been verified in this environment.
