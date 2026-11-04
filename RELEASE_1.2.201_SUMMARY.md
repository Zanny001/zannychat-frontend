# ZannyChat release 1.2.201

## Included
- Privacy hardening for queued message and attachment retries.
- Retry failures are mapped to user-safe copy before persistence and UI display; raw database/provider/schema diagnostics are not retained in outbox error fields.
- Legacy persisted retry errors are sanitized during normalization, so older saved error details are not displayed after the upgrade.
- Existing queue/retry behavior and backoff remain intact.

## Verification
- Frontend unit tests: 354 passed, 0 failed.
- Backend unit tests: 173 passed, 0 failed.
- Frontend release audit: 12/12 passed.
- JSON manifest parsing and release-version consistency checked.
- ZIP integrity checked after packaging.

## Not performed
- No deployment to Netlify or Render.
- No live Supabase migration was required or executed.
- No production build, device test, or live end-to-end test was performed.
- This is an incremental release, not a claim that all WhatsApp/Telegram parity gaps are complete.
