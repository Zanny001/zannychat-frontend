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
