import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const script = path.resolve('scripts/audit-bundle-dependencies.mjs');
const repositoryLock = JSON.parse(fs.readFileSync(path.resolve('package-lock.json'), 'utf8'));

function runWithMap(sources, lockOverrides = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zannychat-bundle-audit-'));
  try {
    const exportDir = path.join(root, 'export');
    const lockfilePath = path.join(root, 'package-lock.json');
    fs.mkdirSync(exportDir, { recursive: true });
    fs.writeFileSync(
      lockfilePath,
      JSON.stringify({
        ...repositoryLock,
        packages: { ...repositoryLock.packages, ...lockOverrides },
      }),
    );
    if (sources !== null) {
      fs.writeFileSync(
        path.join(exportDir, 'index.js.map'),
        JSON.stringify({ version: 3, file: 'index.js', sources, names: [], mappings: '' }),
      );
    }
    return spawnSync(
      process.execPath,
      [script, '--lockfile', lockfilePath, exportDir],
      { encoding: 'utf8' },
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('passes when source maps contain no vulnerable package sources', () => {
  const result = runWithMap(['../src/App.js', '../node_modules/react/index.js']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /PASS: no vulnerable minimatch, picomatch, or glob/);
});

test('fails when root picomatch 4.0.7 is included in a production bundle', () => {
  const result = runWithMap(['../../node_modules/picomatch/index.js']);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /VULNERABLE: picomatch@4.0.7/);
});

test('detects a vulnerable nested picomatch copy rather than its parent package', () => {
  const result = runWithMap(['../../node_modules/micromatch/node_modules/picomatch/index.js']);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /VULNERABLE: picomatch@2.3.2/);
});

test('fails when minimatch 10.2.6 is included in a production bundle', () => {
  const result = runWithMap(['../../node_modules/minimatch/dist/commonjs/index.js']);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /VULNERABLE: minimatch@10.2.6/);
});

test('does not flag patched nested minimatch 11.0.5', () => {
  const result = runWithMap(['../../node_modules/glob/node_modules/minimatch/index.js']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /PATCHED: minimatch@11.0.5/);
});

test('does not flag patched glob 14.0.4', () => {
  const result = runWithMap(['../../node_modules/glob/index.js']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /PATCHED: glob@14.0.4/);
});

test('flags vulnerable glob 14.0.1 using the lockfile version', () => {
  const result = runWithMap(
    ['../../node_modules/glob/index.js'],
    { 'node_modules/glob': { ...repositoryLock.packages['node_modules/glob'], version: '14.0.1' } },
  );
  assert.equal(result.status, 1);
  assert.match(result.stdout, /VULNERABLE: glob@14.0.1/);
});

test('fails closed when a nested vulnerable package has no lockfile mapping', () => {
  const result = runWithMap(['../../node_modules/some-parent/node_modules/minimatch/index.js']);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /VULNERABLE: minimatch@unknown/);
});

test('fails closed when no source maps are present', () => {
  const result = runWithMap(null);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /no source maps found/);
});

test('fails closed when source maps contain no inspectable source entries', () => {
  const result = runWithMap([]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /no inspectable source entries/);
});
