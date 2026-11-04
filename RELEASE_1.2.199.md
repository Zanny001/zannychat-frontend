# ZannyChat frontend 1.2.199 — production diagnostic privacy

## Changes
- Added a shared development-only diagnostic logger. It is silent unless the runtime explicitly identifies itself as a development build.
- Routed backend request performance/failure diagnostics through the guarded logger, preventing production logs from recording request paths that may contain conversation or resource identifiers.
- Removed contact and conversation IDs from New Chat success/debug messages; timing and event diagnostics are development-only.
- Added regression tests for production-default silence and development logging behavior.

## Validation
- Unit tests and release hygiene audit are run as part of this release package.

## Deployment status
- Source package only; this release has not been deployed to production.
