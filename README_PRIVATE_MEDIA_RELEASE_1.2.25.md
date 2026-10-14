# ZannyChat 1.2.25 — Accessible message controls

## What changed

- Added a dynamic screen-reader label and hint to voice-message playback, announcing whether the action will play or pause the clip.
- Link-preview cards are announced as links with a useful destination label and hint.
- Image, file, and contact attachments now expose action-oriented labels and hints.
- Message bubbles explain long-press actions and swipe-to-reply for assistive-technology users.
- Added dependency-free accessibility contract tests to catch regressions in these shared message controls.
- Updated the release static verifier to match 1.2.25 and include the new accessibility contracts. This also fixes the prior verifier's placement of newly appended checks after its result summary, which meant those checks were not included in the reported count.

## Validation

- Frontend utility and accessibility contract tests: see `FRONTEND_UNIT_TESTS_1.2.25.txt`.
- Frontend JS/JSX syntax parse: see `FRONTEND_PARSE_1.2.25.txt`.
- Backend JS syntax checks: see `BACKEND_SYNTAX_1.2.25.txt`.
- Static release verification: see `STATIC_VERIFICATION_1.2.25.txt`.
- ZIP integrity: see `ZIP_INTEGRITY_1.2.25.txt`.
- SHA-256: see `zannychat-sha256-v1.2.25.txt`.

## Scope and limitations

This release improves the accessibility labels of shared message controls; it is not a complete WCAG audit. Dynamic text sizing, contrast, keyboard/switch-control navigation, and real screen-reader behavior still need device testing. Backend Jest, Expo Android/iOS builds, live Supabase migrations/RLS integration, and production deployment were not verified here.
