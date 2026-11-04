# ZannyChat Upgrade Status — Pass 19

**Scope:** source-only release verification snapshot. No production deployment or live Supabase mutation was performed.

## Included in this snapshot
- Email OTP verification screen and Supabase Auth verify/resend wrappers.
- Google OAuth signup entry point (requires a live redirect/callback test).
- Private chat media handling via short-lived signed URLs.
- Self-service chat hiding/leaving semantics that remove only the current user's participant row.
- Generic client-facing errors on selected backend routes.
- Wallet feature removed from active UI/API paths.
- Frontend release hygiene audit script at `scripts/audit_frontend_release.py`.

## Local checks run for this snapshot
- Frontend unit tests: 45 passed, 0 failed.
- Frontend release hygiene audit: 11 passed, 0 failed.
- Backend health/security/validation tests: 14 passed, 0 failed.
- Chat deletion migration/static checks: 2 passed, 0 failed.
- Conversation error-disclosure checks: 2 passed, 0 failed.
- Route error-disclosure checks: 3 passed, 0 failed.
- Wallet-removal checks: 2 passed, 0 failed.

These are local source-level checks. They do not prove production configuration, authorization policies, email delivery, push delivery, OAuth callback correctness, or physical-device behavior.

## Release gates still open
1. Configure and verify Brevo SMTP in Supabase; ensure the Confirm signup email template sends the numeric token (`{{ .Token }}`) expected by the app.
2. Test signup, invalid/expired code, resend throttling, and successful verification against the actual Supabase project.
3. Complete Google OAuth callback and session persistence tests on web and a physical device.
4. Run two-account media authorization tests (authorized conversation member vs. non-member) against Supabase Storage RLS.
5. Test message send/reconnect/realtime behavior and push notifications on physical devices.
6. Run a production web export/build and smoke-test critical journeys at the hosted URL.
7. Review current dependency vulnerability findings and resolve or document actionable issues.

## Deployment status
**Not deployed by this pass.** Keep production changes gated on the release items above.


## 1.2.43 attachment upload retry queue

Added a bounded local retry queue for image, file, and voice-note upload failures. Queue entries are removed before the database insert to avoid blind duplicate attachment sends when the insert result is uncertain. See `ATTACHMENT_RETRY_1.2.43.md` for limitations and recovery behavior.

## Increment 1.2.83 — group message status details
- Added a message-action entry for per-member group message status on confirmed outgoing messages.
- Status display prioritizes read cursor, then explicit delivery receipt, then an awaiting-receipt label; it does not claim that missing receipts prove non-delivery.
- Frontend unit tests: 96 passed, 0 failed.
- Frontend release hygiene audit: 12/12 passed.
- Backend group regression/migration tests: 17 passed, 0 failed.
- No live migration, hosted integration, native build, or physical-device test was performed.

## Increment 1.2.125 — configurable Story expiry
- Added 6/12/24/48-hour lifetime selection to status publishing for text, photo, and video.
- Stored expiry uses the existing `status_updates.expires_at` field; no migration required.
- Added regression tests for allowed durations, expiry math, and invalid inputs.
- Source-only change; no production deployment was performed.

## Increment 1.2.131 — premium contact profile and media experience
- Added a dedicated private-chat contact profile opened from the contact name or avatar; only available profile fields are displayed.
- Added pre-send media review for images/videos, image crop via system picker, caption entry, and quick emoji insertion.
- Added inline video playback in chat and save-to-device actions for chat and Status images/videos.
- Extended the attachment retry queue to accept video records.
- Frontend unit tests: 220 passed, 0 failed; release hygiene audit: 12/12 passed; modified JSX files parsed successfully.
- `expo-media-library` requires lockfile refresh in a networked environment because the npm registry was unavailable during this pass. A native rebuild and physical-device permission/save tests remain release gates.
- Source-only change; no live deployment or Supabase mutation performed.

## Pass 1.2.133 — Media-save content validation
- Preserves supported media extensions from URL paths, including common image formats and MOV/M4V/WebM videos.
- Validates response Content-Type when supplied to avoid saving HTML/JSON error responses as media.
- Added unit coverage for extension preservation and incompatible response content types.
- Validation: frontend unit tests and release hygiene audit run locally; native device testing and production deployment remain outstanding.

## Pass 1.2.135 — App-wide design system elevation
- Added semantic color tokens for elevated/glass surfaces, success, warning, focus, scrim, and shadow across every mood palette.
- Added shared layout tokens for 44pt minimum touch targets, control/header heights, content width, and section spacing.
- Improved shared typography readability with more generous body and caption line-height.
- Added unclipped shared card elevation and a 44pt back-button target in the common header.
- Added design-system regression coverage for palette completeness, layout contracts, and typography.
- Frontend unit tests: 228 passed, 0 failed; release hygiene audit: 12/12 passed; modified JSX/JS files passed TypeScript parser transpilation checks.
- Source-only change; no live deployment or Supabase mutation performed. Physical-device visual and accessibility testing remains required.

## Pass 1.2.136 — Light mode and accessibility preferences

- Added persistent System / Light / Dark appearance selection. System follows the operating system's color scheme; existing mood palettes continue to drive the dark theme.
- Added persistent shared typography scaling (Standard / Large / Extra large) and a higher-contrast preference.
- Added screen-reader names, roles, and selected-state announcements to appearance and text-size controls.
- Added semantic light-mode colors and stronger light-mode action/accent colors, plus high-contrast text and border tokens.
- Automated local verification: 231 unit tests pass; frontend release audit passes 12/12.
- Remaining release gates: full Expo/native production build, device screenshots across all screens, manual contrast review for any hard-coded colors, and VoiceOver/TalkBack verification.

## Pass 1.2.137 — System appearance and status bar alignment

- Changed Expo `userInterfaceStyle` to `automatic` so the operating system's light/dark scheme can reach the app when appearance is set to System.
- Status bar content now adapts to the resolved app theme: dark icons in Light mode, light icons in Dark mode.
- Added unit coverage for status-bar appearance mapping.
- Validation: 234 frontend unit tests passed; release hygiene audit passed 12/12; `app.json` and `package.json` parse as valid JSON.
- Remaining release gates: install dependencies in a networked environment, run a native/web production build, and confirm system appearance switching on physical Android/iOS devices.
- Source-only change; no live deployment or Supabase mutation performed.
