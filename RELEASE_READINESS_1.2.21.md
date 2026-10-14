# ZannyChat 1.2.21 — release readiness

## Implemented
- Per-account, per-conversation on-device draft persistence.
- Bounded draft text and storage-safe key construction.
- Draft restoration when reopening a conversation and after leaving message-edit mode.
- Successful sends clear drafts; failed sends preserve composer text for retry.
- Account deletion attempts to remove drafts belonging to the deleted account.
- Unit tests cover key scoping, size bounds, and blank content.

## Verified in this environment
- Frontend dependency-free unit tests passed: 30/30.
- ZIP integrity is checked for the release archive.
- JavaScript/JSX syntax parsing and backend JavaScript syntax checks are run separately and their results are recorded.

## Still required before production
1. Install dependencies in a network-enabled environment and run backend Jest with the committed lockfile.
2. Run Expo Android and iOS exports/builds with a supported, pinned dependency set.
3. Execute SQL migrations and RLS tests against a disposable staging Supabase project.
4. Verify draft restoration, failed-send retry, account switching, and account-deletion cleanup on physical Android/iOS devices.
5. Complete independent security review and test all critical flows before production deployment.

No production deployment or live database mutation was performed.
