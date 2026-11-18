#!/usr/bin/env node
/**
 * Inspect Expo production source maps for vulnerable glob-matching packages.
 *
 * This is a reachability check, not a replacement for npm audit. It reports
 * package source files included in each platform's production JS bundle.
 */
import fs from 'node:fs';
import path from 'node:path';

const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.error('Usage: node scripts/audit-bundle-dependencies.mjs <export-dir> [<export-dir> ...]');
  process.exit(2);
}

const vulnerablePackages = new Set(['minimatch', 'picomatch']);
const additionalPackagesToReport = new Set([
  'glob',
  '@expo/fingerprint',
  '@expo/cli',
  '@expo/config',
  '@expo/config-plugins',
  '@expo/metro-config',
]);

function packageNameFromSource(source) {
  const normalized = String(source).replaceAll(String.fromCharCode(92), '/');
  const match = normalized.match(/(?:^|\/)node_modules\/((?:@[^/]+\/)?[^/]+)(?:\/|$)/);
  return match?.[1] ?? null;
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
  const additionalHits = new Set();
  let sourceCount = 0;

  function inspectMap(map, mapPath) {
    if (Array.isArray(map.sources)) {
      for (const source of map.sources) {
        sourceCount += 1;
        const combined = map.sourceRoot ? `${map.sourceRoot}/${source}` : source;
        const packageName = packageNameFromSource(combined);
        if (packageName && vulnerablePackages.has(packageName)) {
          vulnerableHits.add(`${packageName}: ${mapPath} -> ${source}`);
        } else if (packageName && additionalPackagesToReport.has(packageName)) {
          additionalHits.add(`${packageName}: ${mapPath} -> ${source}`);
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
  console.log(`Related Expo/build-tool sources: ${additionalHits.size}`);
  for (const hit of additionalHits) console.log(`  BUILD TOOL: ${hit}`);

  if (vulnerableHits.size > 0) failed = true;
}

if (failed) {
  console.error('\nFAIL: production bundle reachability check did not pass.');
  process.exit(1);
}

console.log('\nPASS: no minimatch or picomatch package source files were found in the inspected production bundles.');
console.log('Note: this does not clear npm audit or prove absence of all runtime risks; it assesses source-map module inclusion only.');
