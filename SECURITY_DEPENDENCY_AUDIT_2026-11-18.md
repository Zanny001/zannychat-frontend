# Frontend Dependency Security Audit — 2026-11-18

## Status

**Open — upstream dependency fixes are incomplete for the current Expo SDK 57 toolchain.**

The dependency-audit job is intentionally enforced and currently fails. The client-quality and production-bundle reachability jobs run independently and passed on 2026-11-18. Do not suppress, skip, or downgrade the audit gate to obtain a green workflow.

Latest verification on PR #166 head `c990485736429642da3eeaac94de340270b27b6f`:
- Advanced calling workflow run #1282: [44253559291](https://github.com/Zanny001/zannychat-frontend/actions/runs/44253559291)
- Advanced calling workflow run #1283: [44253585349](https://github.com/Zanny001/zannychat-frontend/actions/runs/44253585349)
- In both runs, `client-quality`: **passed all 21 validation steps**.
- In both runs, `bundle-exposure-audit`: **passed** for web, Android, and iOS.
- In both runs, `dependency-audit`: failed as expected; **28 findings (4 moderate, 24 high, 0 critical)**.
- Premium status and LIVE quality workflows: passed.

## Findings from the CI audit

### GHSA-3g3m-2fjr-6pw4 — glob (moderate) — resolved by the PR #162 lockfile update

A fresh audit of the old `main` lockfile reported 29 findings (3 moderate, 26 high). One additional moderate finding was `glob` 9.0.0–14.0.1, including a nested copy under the older `@expo/fingerprint` dependency. The advisory is fixed in `glob@14.0.2`.

PR #162 updates `@expo/fingerprint` from 0.20.15 to 0.20.16. On that exact PR head, the lockfile no longer contains the vulnerable nested `glob` copy; the root `glob@14.0.4` is outside the affected range and uses `minimatch@11.0.5`. The fresh audit on the PR #162 dependency tree returned 28 findings (4 moderate, 24 high), and the `glob` advisory was no longer present.

This is a specific dependency-tree improvement from PR #162, not a clean audit. It must be retained when reviewing the security bundle-audit branch.

### GHSA-g3hv-75wg-m249 — minimatch (moderate)

npm reports the vulnerable range as `minimatch 7.0.0–11.0.0`, with the fix in `11.0.1`.

Resolved dependency paths include:
- `@expo/fingerprint` → `minimatch`
- `expo` → Expo CLI / Metro tooling → `@expo/fingerprint`

Lockfile snapshot on this branch:
- Root `minimatch@10.2.6` — affected.
- `glob/node_modules/minimatch@11.0.5` — outside the reported affected range.

Expo's SDK 57 source still declares `minimatch@^10.2.6` directly in `@expo/fingerprint@0.20.16`. Expo maintainers have explicitly retained this range for SDK 57 and earlier because changing the major version has observable compatibility implications. Therefore, do not force minimatch 11 through npm overrides or manual lockfile edits.

### GHSA-fc5q-39xc-vjpf — picomatch (high)

npm reports a high-severity ReDoS finding for single-branch repeated extglobs.

Resolved dependency paths include:
- Expo CLI / Metro packages → `picomatch`
- `micromatch` → `picomatch`
- `jest-util` → `picomatch`
- React Native codegen / Metro-related packages → `tinyglobby` / `fdir` → `picomatch`

Lockfile snapshot on this branch:
- Root `picomatch@4.0.7`.
- Nested `picomatch@2.3.2` under `jest-util` and `micromatch`.

No patched npm release newer than 4.0.7 was verified when this audit was recorded. Do not invent a version, force an unpublished version, or apply an unreviewed override. Recheck the advisory and registry before changing this dependency.

## Production bundle reachability results

The source-map scanner completed successfully in both workflow runs above. Exact results were identical:

| Platform | Source maps | Source entries inspected | Vulnerable package sources | Related Expo/build-tool sources |
|---|---:|---:|---:|---:|
| Web | 2 | 1,550 | 0 | 0 |
| Android | 1 | 2,314 | 0 | 0 |
| iOS | 1 | 2,317 | 0 | 0 |

No source-map module entries from affected `minimatch`, `picomatch`, or `glob` versions were found in the inspected production JavaScript bundles. Scanner tests passed, including nested package resolution, vulnerable and patched versions, missing maps, empty maps, and unknown lockfile mappings.

This is evidence that these vulnerable package sources are not included in the inspected production JavaScript bundles. It is **not** proof that the packages are absent from the build dependency graph, that native binaries or server-side components are unaffected, or that every runtime risk is eliminated. Source maps were ephemeral CI files and were not uploaded or deployed.

## Expo upstream assessment

Expo maintainers' discussion of the related glob/minimatch advisories says the affected packages are development/build tooling and do not ship as application code; the SDK 57-and-earlier support line has a different mitigation path from SDK 58 and newer. The same discussion says the direct minimatch 10 range is retained in fingerprint due to breaking changes.

This is useful risk context, not a replacement for the direct bundle assessment or npm audit. The independent source-map assessment now provides evidence of zero affected package sources in the inspected web, Android, and iOS JavaScript exports. The dependency audit nevertheless remains open.

References:
- Expo issue and maintainer resolution: https://github.com/expo/expo/issues/52735
- Expo SDK 57 package line: https://github.com/expo/expo/tree/sdk-57
- minimatch advisory: https://github.com/advisories/GHSA-g3hv-75wg-m249
- picomatch advisory: https://github.com/advisories/GHSA-fc5q-39xc-vjpf

## Compatibility guardrails

Keep these app platform versions unchanged during this remediation unless a separate, fully validated upgrade is approved:
- Expo SDK 57
- React Native 0.86.3
- React 19.2.3
- LiveKit native packages and CallKit integration

Do not:
- run `npm audit fix --force`;
- downgrade Expo or React Native to satisfy npm's suggested fix;
- force `minimatch@11` into Expo fingerprint;
- suppress the audit job, add `continue-on-error`, or lower the severity threshold;
- claim a vulnerability is fixed based only on a transitive package override.

## Required follow-up before closing this audit

1. Re-run `npm audit --json` on the current PR head and retain the complete report as the comparison baseline.
2. Recheck the Expo SDK 57 release branch and npm registry for a published, compatible upstream patch to fingerprint, Metro, and CLI. Upgrade only within SDK 57's supported version ranges, then run Expo config, prebuild, native compile, web export, and the full client-quality suite.
3. Recheck the picomatch advisory and npm registry. Only move to a version that is actually published and explicitly outside the advisory's affected range.
4. **Completed:** production web, Android, and iOS bundles were exported with source maps and inspected. All three platform checks passed with zero affected package sources. See `SECURITY_BUNDLE_REACHABILITY_AUDIT.md`.
5. Keep `npm audit --audit-level=high` enforced until all high findings are fixed or formally reviewed and the repository's security policy explicitly accepts a documented exception. Keep moderate findings tracked as well.
6. Re-run all release/readiness/contract/integrity checks and confirm CI results before marking this record resolved. The client-quality suite passed in both PR #166 workflow runs.

## Current disposition

The production JavaScript bundle reachability assessment passed for all three platforms, and the full client-quality suite passed in both workflow runs. The known npm audit failure remains visible and enforced: 28 findings (4 moderate, 24 high, 0 critical). No dependency versions were changed as part of this tracking record. ### Formal temporary risk acceptance — 2026-11-18

**Decision:** The repository/product owner explicitly authorized temporary acceptance of the remaining dependency risk on 2026-11-18, after reviewing the 28-finding npm audit, the SDK 57 compatibility constraints, and the successful three-platform production JavaScript bundle reachability assessment.

**Scope of acceptance:** This exception is limited to the currently identified transitive build/development-tooling findings in the existing Expo SDK 57 dependency tree. It does not declare the findings fixed, does not assert that native binaries or server-side components are unaffected, and does not waive the npm audit gate. The audit continues to fail visibly and must not be suppressed.

**Controls retained:**
- Keep the npm audit high-severity CI job enforced.
- Do not apply unreviewed overrides, force installs, or unsupported Expo/React Native downgrades.
- Keep the source-map reachability scan and client-quality checks required.
- Recheck upstream advisories and published compatible fixes at the review date.
- Revoke this exception immediately if new evidence indicates affected package code is shipped or exploitable in a production execution path.

**Review and expiry:** Review this exception no later than **2026-12-02**. It expires automatically on **2026-12-18** unless a fresh written risk review renews it. The target is to remove the affected dependency paths through compatible upstream releases before expiry.

**Residual risk:** A malicious or adversarially crafted input reaching the affected build tooling could still trigger the reported resource-exhaustion behavior during development or build operations. The successful source-map scans only establish that affected package sources were not present in the inspected production JavaScript bundles; they do not eliminate build-time risk.

This is a temporary project-level risk decision, not a declaration of full security compliance or a clean dependency audit. PR #162 has been merged. PR #166 records the audit controls and temporary disposition; production deployment remains a separate approval step.
