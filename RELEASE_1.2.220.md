# ZannyChat canonical release 1.2.220

- Frontend: 1.2.220
- Backend: 1.2.59 (unchanged)
- Database: no new migration; migration `0057_private_phone_discovery.sql` remains required for phone discovery.
- Focus: premium account-safety entry points in Settings.
- Canonical base: reconciled source package 1.2.219.

## Changes
- Settings now has first-class, accessible cards for Privacy & Security and Devices & Sessions.
- The cards reuse existing screens and authenticated controls; no fake session list or unsupported encryption claims were introduced.
- Frontend package, Expo app config and lockfile root version are aligned to 1.2.220.

## Validation actually completed
- Frontend unit tests: 399 passed, 0 failed.
- Frontend release audit: 12/12 checks passed.
- ZIP archive integrity checked after packaging.

## Release blockers
- The existing lockfile does not include `expo-contacts`, despite `package.json` declaring it. `npm install --package-lock-only` did not finish in this environment, so dependency lock regeneration is **not complete**.
- No native Android/iOS build or physical-device test was run.
- Full backend test suite, staging smoke test and production deployment were not run.

This is a tested source increment, not approved for production deployment. Do not deploy until the dependency lock is regenerated with the intended Expo SDK, native builds and device permission flows pass, the backend suite passes, and staging validation is approved.
