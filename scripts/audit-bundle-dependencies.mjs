#!/usr/bin/env node
/**
 * Inspect Expo production source maps for vulnerable glob-matching packages.
 *
 * This is a reachability check, not a replacement for npm audit. It reports
 * vulnerable package source files included in each platform's production JS bundle.
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
let lockfilePath = path.resolve('package-lock.json');
const lockfileArg = args.indexOf('--lockfile');
if (lockfileArg !== -1) {
  if (!args[lockfileArg + 1]) {
    console.error('FAIL: --lockfile requires a path');
    process.exit(2);
  }
  lockfilePath = path.resolve(args[lockfileArg + 1]);
  args.splice(lockfileArg, 2);
}
const targets = args;
if (targets.length === 0) {
  console.error('Usage: node scripts/audit-bundle-dependencies.mjs [--lockfile package-lock.json] <export-dir> [<export-dir> ...]');
  process.exit(2);
}

let lockPackages;
try {
  const lockfile = JSON.parse(fs.readFileSync(lockfilePath, 'utf8'));
  lockPackages = lockfile.packages;
  if (!lockPackages || typeof lockPackages !== 'object') throw new Error('lockfile has no packages map');
} catch (error) {
  console.error(`FAIL: cannot read dependency lockfile ${lockfilePath}: ${error.message}`);
  process.exit(2);
}

const additionalPackagesToReport = new Set([
  '@expo/fingerprint',
  '@expo/cli',
  '@expo/config',
  '@expo/config-plugins',
  '@expo/metro-config',
]);

function versionParts(version) {
  const match = String(version ?? '').match(/^(\d+)\.(\d+)\.(\d+)/);
  return match ? match.slice(1).map(Number) : null;
}

function compareVersions(left, right) {
  const a = versionParts(left);
  const b = versionParts(right);
  if (!a || !b) return null;
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

function isVulnerable(packageName, version) {
  if (!version) return true; // Unknown lockfile mapping fails closed.
  if (packageName === 'minimatch') {
    const lower = compareVersions(version, '7.0.0');
    const upper = compareVersions(version, '11.0.1');
    return lower === null || upper === null || (lower >= 0 && upper < 0);
  }
  if (packageName === 'picomatch') {
    const upper = compareVersions(version, '4.0.7');
    return upper === null || upper <= 0;
  }
  if (packageName === 'glob') {
    const lower = compareVersions(version, '9.0.0');
    const upper = compareVersions(version, '14.0.2');
    return lower === null || upper === null || (lower >= 0 && upper < 0);
  }
  return false;
}

function packageInstallPathFromSource(source) {
  const normalized = String(source).replaceAll(String.fromCharCode(92), '/');
  const matches = [...normalized.matchAll(/(?:^|\/)(node_modules\/(?:@[^/]+\/)?[^/]+)(?=\/|$)/g)];
  // Use the deepest node_modules segment so nested copies are not mistaken
  // for their parent package (for example micromatch/node_modules/picomatch).
  return matches.at(-1)?.[1] ?? null;
}

function packageNameFromInstallPath(installPath) {
  const marker = 'node_modules/';
  const index = installPath.lastIndexOf(marker);
  return index === -1 ? null : installPath.slice(index + marker.length);
}

function collectMaps(directory) {
  const maps = [];
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (entry.isFile() && entry.name.endsWith('.map')) maps.push(fullPath);
    }
  }
  walk(directory);
  return maps;
}

let failed = false;
for (const target of targets) {
  if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
    console.error(`FAIL: export directory does not exist: ${target}`);
    failed = true;
    continue;
  }

  const maps = collectMaps(target);
  if (maps.length === 0) {
    console.error(`FAIL: no source maps found under ${target}; exposure cannot be assessed`);
    failed = true;
    continue;
  }

  const vulnerableHits = new Set();
  const patchedHits = new Set();
  const additionalHits = new Set();
  let sourceCount = 0;

  function inspectMap(map, mapPath) {
    if (Array.isArray(map.sources)) {
      for (const source of map.sources) {
        sourceCount += 1;
        const installPath = packageInstallPathFromSource(source);
        if (!installPath) continue;
        const packageName = packageNameFromInstallPath(installPath);
        const version = lockPackages[installPath]?.version;
        const hit = `${packageName}@${version ?? 'unknown'}: ${mapPath} -> ${source}`;

        if (['minimatch', 'picomatch', 'glob'].includes(packageName)) {
          if (isVulnerable(packageName, version)) vulnerableHits.add(hit);
          else patchedHits.add(hit);
        } else if (additionalPackagesToReport.has(packageName)) {
          additionalHits.add(hit);
        }
      }
    }
    if (Array.isArray(map.sections)) {
      for (const section of map.sections) {
        if (section?.map) inspectMap(section.map, mapPath);
      }
    }
  }

  for (const mapPath of maps) {
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    } catch (error) {
      console.error(`FAIL: cannot parse source map ${mapPath}: ${error.message}`);
      failed = true;
      continue;
    }
    inspectMap(parsed, path.relative(target, mapPath));
  }

  if (sourceCount === 0) {
    console.error(`FAIL: source maps under ${target} contained no inspectable source entries`);
    failed = true;
  }

  console.log(`\nPlatform export: ${target}`);
  console.log(`Source maps: ${maps.length}; source entries inspected: ${sourceCount}`);
  console.log(`Vulnerable package sources: ${vulnerableHits.size}`);
  for (const hit of vulnerableHits) console.log(`  VULNERABLE: ${hit}`);
  console.log(`Patched glob-matching package sources: ${patchedHits.size}`);
  for (const hit of patchedHits) console.log(`  PATCHED: ${hit}`);
  console.log(`Related Expo/build-tool sources: ${additionalHits.size}`);
  for (const hit of additionalHits) console.log(`  BUILD TOOL: ${hit}`);

  if (vulnerableHits.size > 0) failed = true;
}

if (failed) {
  console.error('\nFAIL: production bundle reachability check did not pass.');
  process.exit(1);
}

console.log('\nPASS: no vulnerable minimatch, picomatch, or glob package sources were found in the inspected production bundles.');
console.log('Note: this does not clear npm audit or prove absence of all runtime risks; it assesses source-map module inclusion only.');
