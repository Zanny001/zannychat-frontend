# ZannyChat 1.2.159

## Focus: message outbox timestamp recovery

This release canonicalizes valid pending-message timestamps and recovers malformed timestamps to safe defaults. Invalid creation dates no longer produce unstable oldest-first ordering, and invalid retry dates no longer influence retry delays.

## Validation

See automated test and release-audit results from the packaging run. This is a source package only; no production deployment is performed.
