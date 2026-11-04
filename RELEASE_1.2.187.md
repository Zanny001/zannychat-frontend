# ZannyChat 1.2.187

- Replaced per-feed raw reaction/comment/view row downloads with a bounded SQL aggregation RPC.
- Avoids undercounting channel post engagement when raw rows exceed API response caps.
- Added migration and regression tests; migration 0049 must be applied before backend deployment.
- Frontend package/app version aligned to 1.2.187.

This is a source release, not a production deployment.
