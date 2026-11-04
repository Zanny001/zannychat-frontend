# ZannyChat upgrade pass 1.2.123

## Implemented
- Expanded the signed-in primary navigation from two destinations to four: Chats, Updates, Channels, and Profile. This exposes the existing status/story and channel experiences directly rather than hiding them behind secondary navigation.
- Refined the bottom navigation with consistent accessible tab labels, stronger label hierarchy, spacing, and a taller translucent/glass treatment that follows the active theme.
- Bumped the frontend package, lockfile root package, and Expo app version to 1.2.123.

## Validation
- Frontend utility test suite: 199 passed, 0 failed.
- Frontend release audit: 12/12 checks passed.

## Important scope and release notes
- This is a source-code upgrade bundle. It has not been deployed to Netlify or Render, and no live Supabase schema/configuration was changed.
- The existing source contains substantial features such as chat folders, drafts, saved messages, status updates, channels, polls, events, scheduled messages, group management, and privacy/settings screens. Their presence in source is not proof of complete production end-to-end readiness.
- The supplied parity assessment still identifies major work requiring separate design and implementation: audited end-to-end encryption/device keys, real WebRTC calling infrastructure, full linked-device pairing, and mature bot/mini-app/business/monetization systems. Do not advertise those as complete until implemented and independently tested.
- Before production rollout, install dependencies and run platform builds, backend tests, two-account authorization checks, and live smoke tests against staging. Deploy only after verifying environment variables and database migrations.
