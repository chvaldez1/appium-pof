import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertIosAppBuild, expectedIosAppBuild } from '@config/ios-app-build.ts';

void test('accepts the configured iOS beta version and build', () => {
  assert.doesNotThrow(() => assertIosAppBuild(expectedIosAppBuild));
});

void test('rejects a previous build before any test starts', () => {
  assert.throws(
    () => assertIosAppBuild({ ...expectedIosAppBuild, version: '3.6.7', build: '135' }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.ok(
        error.message.includes(`expected ${expectedIosAppBuild.version} (${expectedIosAppBuild.build})`),
      );
      assert.ok(error.message.includes('found 3.6.7 (135)'));
      return true;
    },
  );
});
