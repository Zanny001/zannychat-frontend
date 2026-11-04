# ZannyChat 1.2.185

## Scheduled-message timestamp validation

- Hardened the backend scheduled-message creation route to accept only explicit ISO-8601 timestamps with a timezone.
- Rejects impossible calendar dates (including February 30), invalid clock fields, malformed offsets, and timestamps outside the existing one-minute-to-30-day scheduling window.
- Added focused backend regression tests for accepted timestamps, invalid dates, timezone offsets, and scheduling-window boundaries.

## Verification scope

This is a source package. Database migrations are unchanged and no production service was deployed by this release. Run frontend and backend test suites, production builds, and staging integration tests before deployment.
