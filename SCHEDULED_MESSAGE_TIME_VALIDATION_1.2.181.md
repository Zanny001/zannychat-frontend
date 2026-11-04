# Scheduled-message time validation — 1.2.181

- Reject invalid Date objects when formatting local scheduling inputs.
- Reject non-finite or malformed reference-clock values before calculating a scheduled timestamp.
- Preserve the existing one-minute minimum lead time, 30-day maximum horizon, and ISO UTC persistence format.
- Added regression tests for invalid Date values and invalid clocks.

Validation: run `npm run test:unit` and `npm run audit:release` from the frontend directory.
