# Channel publishing retry safety — 1.2.124

## Changes
- Persist the client idempotency key alongside a channel post draft before making the publish request.
- Reuse the same key after a timeout, lost response, or app restart when retrying the same post body.
- Generate a new key when the post body changes.
- Mark a request complete after a successful server response, then clean up its persisted state. If cleanup fails, the completion marker prevents an old key from being reused for a later post with identical text.
- Preserve the existing concurrent-tap guard and backend idempotency contract.

## Validation
- Frontend unit suite: 204 passed, 0 failed.
- Release hygiene audit: 12/12 passed.
- Backend static migration regression checks: 8 passed, 0 failed (selected-audience and channel migration checks).

## Limits
This is client-side retry protection combined with the existing backend idempotency key. It does not prove hosted API behavior or replace production verification. No Render, Netlify, or Supabase deployment was performed.
