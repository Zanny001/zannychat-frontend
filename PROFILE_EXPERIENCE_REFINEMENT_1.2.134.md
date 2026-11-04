# Profile Experience Refinement — 1.2.134

## Changes
- Refined the private-chat contact profile into a premium profile hero with an ambient backdrop, clear presence state, avatar, display name, optional username, and About text.
- Added accessible quick actions for returning to the conversation and opening shared media.
- Improved contact-detail hierarchy, spacing, selectable text, and empty-value handling.
- Added a conversation-context card linking to shared photos, videos, and files.
- Kept profile visibility honest: fields are rendered only when present in the participant data; no new personal details are fabricated.
- Updated frontend and Expo app version to 1.2.134.

## Validation
Run `npm run test:unit` and `npm run audit:release`. Device testing is still required for platform-specific visual polish.
