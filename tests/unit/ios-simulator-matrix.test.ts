import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  parseIosMajors,
  selectIosRuntimes,
  type SimulatorRuntime,
} from '@support/devices/ios-simulator-matrix.ts';

const runtime = (version: string, isAvailable = true): SimulatorRuntime => ({
  identifier: `com.apple.CoreSimulator.SimRuntime.iOS-${version.replaceAll('.', '-')}`,
  version,
  platform: 'iOS',
  isAvailable,
  supportedDeviceTypes: [],
});

void test('selects the latest installed patch for each requested release family', () => {
  const selected = selectIosRuntimes([
    runtime('18.6'),
    runtime('26.3'),
    runtime('27.0', false),
    runtime('26.3.1'),
    runtime('27.0'),
  ]);
  assert.deepEqual(
    selected.map(({ major, runtime: found }) => [major, found?.version]),
    [
      [27, '27.0'],
      [26, '26.3.1'],
      [18, '18.6'],
    ],
  );
});

void test('reports a missing release instead of substituting an older installed one', () => {
  const selected = selectIosRuntimes([runtime('18.6'), runtime('26.3.1')]);
  assert.equal(selected[0].major, 27);
  assert.equal(selected[0].runtime, undefined);
});

void test('accepts an explicit diagnostic subset without changing the default matrix', () => {
  assert.deepEqual(parseIosMajors('26,18'), [26, 18]);
  assert.deepEqual(parseIosMajors(undefined), [27, 26, 18]);
  assert.throws(() => parseIosMajors('26,26'));
});
