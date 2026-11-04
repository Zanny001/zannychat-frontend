# ZannyChat 1.2.200 — safe message-send errors

- Replaced raw Supabase/Postgres error logging and user-visible backend messages in the message-send failure path with a small, tested safe-error mapper.
- Known permission, stale-reference, validation, and network failures now give actionable guidance without exposing schema names, database details, or raw provider messages.
- Existing idempotent retry/recovery behavior for ambiguous commits and duplicate message IDs is unchanged.

Validation: run frontend utility tests and `scripts/audit_frontend_release.py`. This source release does not imply production deployment or a live database migration.
