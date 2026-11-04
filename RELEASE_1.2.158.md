# ZannyChat 1.2.158 Release Notes

## Message outbox integrity

Persisted outgoing-message queue data is now normalized when removal and retry-failure operations modify it, so malformed legacy entries and duplicate request IDs are not carried forward by those mutation paths. Empty queues are removed from storage after retry updates. A regression test covers the mutation-path guarantees.

## Validation

Run `node --experimental-default-type=module --test src/utils/*.test.js` and `python3 scripts/audit_frontend_release.py` from `zannychat-frontend-main`. This is a source-only release; production build, device verification, live backend integration, and deployment are not claimed.
