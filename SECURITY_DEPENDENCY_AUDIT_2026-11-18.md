# Frontend Dependency Security Audit — 2026-11-18

## Status

**Open — upstream dependency fixes are incomplete for the current Expo SDK 57 toolchain.**

The dependency-audit job is intentionally enforced and currently fails. The client-quality job runs independently and passed on 2026-11-18. Do not suppress, skip, or downgrade the audit gate to obtain a green workflow.

Latest recorded CI run:
- Workflow: Advanced calling client checks
- Run: 44250072293
- Client-quality: passed
- Dependency-audit: failed
- `npm ci`: 770 packages installed; 771 audited
- Audit result: **28 findings (4 moderate, 24 high, 0 critical)**

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

## Expo upstream assessment

Expo maintainers' discussion of the related glob/minimatch advisories says the affected packages are development/build tooling and do not ship as application code; the SDK 57-and-earlier support line has a different mitigation path from SDK 58 and newer. The same discussion says the direct minimatch 10 range is retained in fingerprint due to breaking changes.

This is useful risk context, **not proof that ZannyChat's production bundle is unaffected**. This repository has not yet recorded a reproducible production-bundle reachability check for every flagged package. Do not label the audit clean or claim zero runtime exposure until that check is performed.

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
4. Produce a production web bundle and inspect its module/source-map graph for `minimatch`, `picomatch`, `glob`, and the affected build-tool packages. Record the exact command, output, and limitations. This is a runtime-exposure assessment, not a replacement for dependency remediation.
5. Keep `npm audit --audit-level=high` enforced until all high findings are fixed or formally reviewed and the repository's security policy explicitly accepts a documented exception. Keep moderate findings tracked as well.
6. Re-run all release/readiness/contract/integrity checks and confirm CI results before marking this record resolved.

## Current disposition

No dependency versions were changed as part of this tracking record. The known audit failure remains visible and enforced. The authenticated-navigation and blank-screen recovery changes in PR #162 are separate from this dependency audit and remain unmerged pending review.
