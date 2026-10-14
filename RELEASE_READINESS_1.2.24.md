# Release readiness — ZannyChat 1.2.24

## Implemented
- Pinned-message cards now reopen the correct conversation and request the original message.
- Safe minimal conversation routing metadata is stored with local pins.
- ChatScreen searches its current page and up to eight older pages, scrolls to the message when found, and applies the existing search highlight treatment.
- Missing/deleted/very old messages are handled with transparent user feedback.
- Added regression coverage for minimal conversation metadata and omission of private URL/token-like fields.

## Verified in this environment
- Focused release checks: 20/20 passed.
- Frontend unit tests: 41/41 passed.
- Frontend JavaScript/JSX syntax parsing: see `FRONTEND_PARSE_1.2.24.txt`.
- Backend JavaScript syntax checks: 19/19 passed.
- `package.json` and `app.json` parse as valid JSON.
- ZIP archive integrity check passed after packaging.

## Not verified
- Android/iOS Expo builds or device/emulator runtime behavior.
- Backend Jest tests (dependency installation was not available/reliable in this environment).
- Supabase staging migrations, RLS/integration, or live account and message flows.
- Live auth recovery email delivery or production deployment.

## Known limitations
- Pins are device-local AsyncStorage bookmarks and do not sync. AsyncStorage is not independently encrypted.
- Message lookup is bounded to eight older pages to avoid unbounded history downloads. A target older than that may require manually loading more history.
- Deleted messages cannot be recovered. This does not add server-side pinning or end-to-end encryption.
