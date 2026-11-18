# Production Bundle Dependency Reachability Audit

## Purpose

The npm audit findings must be assessed separately from whether vulnerable package code is included in ZannyChat's shipped JavaScript. This check exports the production web, Android, and iOS JavaScript bundles with source maps and inspects source-map module paths and resolves each package copy against the exact npm lockfile.

This is an exposure assessment only. It does **not** remove vulnerable packages, clear npm audit, prove every possible runtime behaviour safe, or replace dependency remediation.

## CI implementation

The `bundle-exposure-audit` job in `.github/workflows/advanced-calling-client.yml`:

1. Installs the exact lockfile with `npm ci`.
2. Creates only a placeholder Firebase configuration for compile-time export; it is not a production credential.
3. Exports web, Android, and iOS production bundles with `--source-maps`.
4. Uses `scripts/audit-bundle-dependencies.mjs` to inspect source-map entries.
5. Resolves nested `node_modules` paths to the exact lockfile entry, then checks the affected ranges for `minimatch`, `picomatch`, and `glob`. Patched versions are reported but do not fail the check. Unknown package versions fail closed.

The script separately reports relevant Expo CLI/config/fingerprint modules. It does not treat a patched `glob` release (14.0.2 or later within the applicable range) or patched `minimatch` release (11.0.1 or later) as vulnerable.

Source maps are generated only in the ephemeral CI workspace. They are not uploaded as artifacts or deployed.

## Interpretation

- **No vulnerable package source found:** evidence that the inspected production JavaScript bundles do not include source files from `minimatch` or `picomatch`. The dependency audit remains open because the packages are still installed in the build dependency graph.
- **Vulnerable package source found:** treat the relevant platform as potentially exposed. Identify the import path and owning package before changing dependencies.
- **Missing or invalid source maps:** inconclusive; the job fails rather than treating missing evidence as a pass.

Source-map reachability is not a complete security proof. It does not inspect native binaries, server-side dependencies, runtime-loaded remote code, or dynamically generated code that has no corresponding source-map entry.

## Dependency remediation constraints

- Keep Expo SDK 57, React Native 0.86.3, React 19.2.3, LiveKit and CallKit versions intact unless a separately validated upgrade is approved.
- Do not force `minimatch@11` into `@expo/fingerprint`; Expo's SDK 57 support line retains `minimatch@^10` because of compatibility concerns.
- Do not install unmerged picomatch pull-request code as a production dependency.
- Keep the npm audit gate visible and enforced. Do not use `continue-on-error`, ignore rules, lowered severity thresholds, or forced downgrades.

## Upstream evidence reviewed

- Expo SDK 57 maintenance discussion and maintainer assessment: https://github.com/expo/expo/issues/52735
- Expo SDK 57 source branch: https://github.com/expo/expo/tree/sdk-57
- minimatch advisory: https://github.com/advisories/GHSA-g3hv-75wg-m249
- picomatch advisory: https://github.com/advisories/GHSA-fc5q-39xc-vjpf
- Expo source-map bundle analysis guidance: https://docs.expo.dev/guides/analyzing-bundles/
- picomatch upstream proposed fixes (not official releases): https://github.com/micromatch/picomatch/pull/237 and https://github.com/micromatch/picomatch/pull/238

## Current status

Pending CI execution on this branch. No dependency version or lockfile changes are made by this audit instrumentation. The audit is not considered resolved until CI evidence is reviewed and any remaining dependency findings have a documented, time-bounded disposition.
