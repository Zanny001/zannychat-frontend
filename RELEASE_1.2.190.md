# ZannyChat 1.2.190

## Improvements
- Completed the client-side load-older-comments flow for channel discussions, consuming the cursor metadata already provided by the backend.
- Preserved chronological display order while older pages are prepended and deduplicated by comment ID.
- Added per-post loading state and pagination regression tests.

## Deployment
This source release has not been deployed to Netlify, Render, or Supabase. Run automated tests and verify the comment cursor against staging before production rollout.
