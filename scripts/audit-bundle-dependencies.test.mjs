import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const script = path.resolve('scripts/audit-bundle-dependencies.mjs');

function runWithMap(sources) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zannychat-bundle-audit-'));
  try {
    const exportDir = path.join(root, 'export');
    fs.mkdirSync(exportDir, { recursive: true });
    if (sources !== null) {
      fs.writeFileSync(
        path.join(exportDir, 'index.js.map'),
        JSON.stringify({ version: 3, file: 'index.js', sources, names: [], mappings: '' }),
      );
    }
    return spawnSync(process.execPath, [script, exportDir], { encoding: 'utf8' });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('passes when source maps contain no vulnerable package sources', () => {
  const result = runWithMap(['../src/App.js', '../node_modules/react/index.js']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /PASS: no minimatch or picomatch/);
});

test('fails when picomatch is included in a production bundle', () => {
  const result = runWithMap(['../../node_modules/picomatch/index.js']);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /VULNERABLE: picomatch/);
});

test('fails when minimatch is included in a production bundle', () => {
  const result = runWithMap(['../../node_modules/minimatch/dist/commonjs/index.js']);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /VULNERABLE: minimatch/);
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
