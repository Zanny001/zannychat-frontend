# Release 1.2.122

- Channel post retries now reuse a client request ID after transient failures.
- The composer ignores concurrent publish taps.
- Backend 1.2.43 deduplicates retried channel posts through an additive database migration.
- Added focused regression tests for client and backend retry handling.
