# ZannyChat 1.2.213 — Status replies pagination

- Status owners now load the newest private replies first and can progressively load older replies.
- Reply queries are bounded to 30 rows per page (maximum 50), use a timestamp cursor, and preserve chronological display within each page.
- Prevents overlapping older-page requests and exposes loading/accessibility feedback.
- No database migration required.

## Verification
Run `node --experimental-default-type=module --test src/utils/*.test.js` and `python3 scripts/audit_frontend_release.py`.

Production deployment and live-device testing are not included in this source release.
