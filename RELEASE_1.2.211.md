# ZannyChat Frontend 1.2.211

## Status audience privacy revalidation

- Revalidates selected Status recipients against the latest conversation contacts and Story privacy exclusions immediately before publishing.
- Fails closed if a selected contact is no longer eligible, has been excluded, or privacy metadata cannot be loaded.
- Avoids passing explicit recipient IDs for broad contacts-only and only-me audiences.
- Adds unit tests for stale contacts, newly excluded recipients, deduplication, empty audience, and non-selected audience behavior.

No backend change or database migration is required. Client-side checks are defense in depth; backend/database authorization remains the security boundary.
