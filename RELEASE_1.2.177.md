# Release 1.2.177

Status feed expiry defense-in-depth: the shared visibility filter now excludes expired, missing-expiry, and malformed-expiry rows so stale cache/realtime data cannot remain visible after its lifetime. Supabase RLS and the server-side expiry query remain authoritative; this client filter is additional protection.

See `STATUS_EXPIRY_VISIBILITY_1.2.177.md` for details. This source package has not been deployed.
