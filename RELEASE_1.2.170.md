# Release 1.2.170

## Reliability
- Prevent silent eviction of oldest unsent messages when normalizing an oversized persisted outbox.
- Refuse to persist a new message when the bounded outbox is full, while allowing an existing request ID to be updated.
- Add regression checks for queue retention and the capacity guard.

## Validation scope
- Frontend unit tests and static release audit are run for this source package.
- Production build, live deployment, backend integration, and physical-device behavior are not certified by this release.
