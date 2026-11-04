# ZannyChat 1.2.189

- Channel comments now load the newest 100 comments instead of permanently showing only the oldest 100.
- Added stable timestamp + comment-ID cursor pagination and `hasMore` metadata for older pages.
- Preserved the existing `comments` response array for compatibility with current clients.
- Added backend regression tests for bounded newest-first retrieval, chronological response order, and cursor validation.

The release archive includes frontend and backend source. Deploying backend changes requires normal staging verification; production services are not changed by creating this archive.
