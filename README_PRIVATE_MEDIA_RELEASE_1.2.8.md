# ZannyChat 1.2.8 release candidate

This release continues development without requiring a public production deployment. It adds password recovery and stronger authentication form validation on top of the 1.2.7 message-search work and the existing security/migration bundle.

## Frontend changes
- Forgot-password link on the login screen.
- Password recovery email request screen with generic confirmation messaging.
- Password reset deep link (`zannychat://reset-password`) and new password form.
- Shared email normalization/validation and signup checks.
- Password minimum is now 8 characters (maximum 128).
- Tests cover email validation, signup validation, and recovery-link token parsing.

## Required before hosted auth testing
Add `zannychat://reset-password` to Supabase Auth's redirect URL allowlist. Configure email delivery and test the link on an Expo development build. Mock mode does not send reset emails.

## Verification status
Utility unit tests are run with Node's built-in test runner. JavaScript syntax checks are performed for backend and non-JSX frontend files. Full Expo export, backend Jest suite, PostgreSQL/Supabase migrations, auth email delivery, and physical-device deep-link tests still need a network-enabled test environment.
