# ZannyChat 1.2.188

- Frontend release manifests advanced to 1.2.188.
- Backend channel-post cursor validation now preserves PostgreSQL timestamp microseconds instead of truncating cursors to JavaScript millisecond precision.
- Added strict timestamp/calendar/timezone validation and regression tests.
- No database migration is required for this release.
- Source package only; production deployment is not performed by this archive build.
