# ZannyChat 1.2.182

- Reject impossible calendar dates and invalid time fields in scheduled-message inputs.
- Preserve valid leap-day scheduling.
- Add regression tests for malformed dates and times.
- Bump frontend package and Expo versions to 1.2.182.

Verification: run `npm run test:unit` and `npm run audit:release` from the frontend directory. This source release does not imply production deployment or live scheduled-message worker availability.
