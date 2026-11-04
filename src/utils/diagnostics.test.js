import test from 'node:test';
import assert from 'node:assert/strict';
import { debugLog, isDebugLoggingEnabled } from './diagnostics.js';

const originalDev = globalThis.__DEV__;
const originalLog = console.log;

test('diagnostics are disabled when the build is not explicitly development', () => {
  try {
    delete globalThis.__DEV__;
    assert.equal(isDebugLoggingEnabled(), false);
    let called = false;
    console.log = () => { called = true; };
    debugLog('private identifier');
    assert.equal(called, false);
  } finally {
    if (originalDev === undefined) delete globalThis.__DEV__;
    else globalThis.__DEV__ = originalDev;
    console.log = originalLog;
  }
});

test('diagnostics are emitted in explicit development builds only', () => {
  try {
    globalThis.__DEV__ = true;
    assert.equal(isDebugLoggingEnabled(), true);
    const args = [];
    console.log = (...values) => args.push(values);
    debugLog('debug event', { elapsedMs: 4 });
    assert.deepEqual(args, [['debug event', { elapsedMs: 4 }]]);
  } finally {
    if (originalDev === undefined) delete globalThis.__DEV__;
    else globalThis.__DEV__ = originalDev;
    console.log = originalLog;
  }
});
