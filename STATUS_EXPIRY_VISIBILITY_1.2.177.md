# ZannyChat 1.2.177 — Status expiry visibility safeguard

- Re-check `expires_at` in the shared client-side Status visibility filter so stale cached/realtime rows disappear even if their original feed query was valid.
- Expired, missing-expiry, and malformed-expiry records fail closed, including the viewer's own private statuses.
- Preserve existing owner, audience, muted-contact, exclusion, and explicit-recipient checks.
- Added deterministic regression coverage for active, expired, malformed, and missing expiry timestamps.

## Validation

- Frontend unit tests: run `npm run test:unit`.
- Release audit: run `npm run audit:release`.
- Source-only release; no live database or hosting changes were performed.
