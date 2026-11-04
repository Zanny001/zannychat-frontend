# ZannyChat Frontend 1.2.219 — Privacy-first Find Friends

## Added
- Native contact import entry point; OS permission is requested only after the user taps Import contacts for review.
- Reviewable, initially unselected phone-number list. Only explicitly selected E.164 numbers are submitted to the existing authenticated phone-discovery endpoint.
- Imported contact rows are held in screen memory only, deduplicated, and cleared after matching or when the user taps Clear imported contacts.
- Numbers without an explicit `+` country code are skipped rather than guessed. Manual entry remains available.
- Utility tests for E.164 normalization, deduplication, opt-in selection, and request caps.

## Privacy / platform notes
- The feature does not persist or automatically upload the address book. The user reviews selections before matching.
- `expo-contacts` is declared as an SDK-managed dependency. Run `npx expo install expo-contacts` in the frontend project and commit the resulting SDK-compatible lockfile before building native binaries.
- Native permission prompt and device behavior still require Android/iOS testing. This pass does not claim a native production build.

## Version alignment
- Frontend: 1.2.219
- Backend: 1.2.59 (unchanged; reuses existing authenticated, rate-limited discovery API)
- Database migration: `0057_private_phone_discovery.sql` remains required from 1.2.218.
