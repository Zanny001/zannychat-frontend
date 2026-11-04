# Message Outbox Timestamp Recovery — 1.2.159

- Canonicalize parseable persisted queue timestamps to ISO 8601 UTC.
- Replace invalid or missing creation timestamps with the epoch fallback so oldest-first recovery remains deterministic.
- Clear malformed retry timestamps so corrupt legacy values cannot delay a retry indefinitely.
- Add regression tests for timezone offsets, invalid dates, non-string values, and overlong timestamps.

Validation: automated frontend unit tests and release audit are run for this package. Production build, device testing, live backend integration, and deployment are not implied by these checks.
