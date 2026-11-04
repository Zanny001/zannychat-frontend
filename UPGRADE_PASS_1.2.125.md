# ZannyChat Upgrade Pass 1.2.125 — configurable Story expiry

## Implemented
- Story/status publishing supports the audited 6, 12, 24, and 48-hour lifetime choices.
- Text, photo, and video status records receive the selected `expires_at` timestamp at creation.
- The publishing screen exposes accessible duration controls and tells the user the selected lifetime.
- The default remains 24 hours for compatibility with existing callers.
- Unsupported durations and invalid timestamps are rejected by the shared status rules utility.

## Validation
- Added unit coverage for all supported durations, exact UTC expiry calculations, and invalid input rejection.
- Run `npm run test:unit` and `npm run audit:release` in the frontend directory before release.

## Scope and production status
- This is a source-only change using the existing `status_updates.expires_at` field; no database migration is required.
- Active status feeds already filter by `expires_at > now`, so selected expiry is reflected by the existing query.
- No live Render, Netlify, or Supabase configuration was changed. Hosted integration and two-account privacy checks remain release gates.
