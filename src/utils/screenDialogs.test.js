import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../screens');

test('screens route alerts through the cross-platform dialog helper', () => {
  const files = fs.readdirSync(root).filter((name) => name.endsWith('.js') && !name.endsWith('.test.js') && !name.endsWith('.contract.test.js'));
  const violations = [];
  for (const name of files) {
    const source = fs.readFileSync(path.join(root, name), 'utf8');
    const executable = source.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    if (/Alert\.alert\(/.test(executable)) violations.push(name + ': direct Alert.alert');
    if (/showAppAlert\(/.test(source) && !/import \{[^}]*showAppAlert[^}]*\} from ['"]\.\.\/utils\/appDialogs['"]/.test(source)) {
      violations.push(name + ': missing showAppAlert import');
    }
  }
  assert.deepEqual(violations, []);
});
