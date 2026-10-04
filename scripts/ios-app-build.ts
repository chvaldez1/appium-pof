import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { timeoutMs } from '../test/settings.ts';

export type IosAppBuild = { bundleId: string; version: string; build: string };

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const expectedIosAppBuild = (
  JSON.parse(readFileSync(resolve(root, 'config/app-build.json'), 'utf8')) as { iosBeta: IosAppBuild }
).iosBeta;

export function assertIosAppBuild(actual: IosAppBuild): void {
  const expected = expectedIosAppBuild;
  if (
    actual.bundleId !== expected.bundleId ||
    actual.version !== expected.version ||
    actual.build !== expected.build
  ) {
    throw new Error(
      `Showpass Beta build mismatch: expected ${expected.version} (${expected.build}) ${expected.bundleId}, found ${actual.version} (${actual.build}) ${actual.bundleId}. Use the matching build before running tests.`,
    );
  }
}

function plistValue(plist: string, key: string): string {
  return execFileSync('/usr/libexec/PlistBuddy', ['-c', `Print :${key}`, plist], {
    encoding: 'utf8',
    timeout: timeoutMs.uiControl,
  }).trim();
}

export function appBuildAtPath(appPath: string): IosAppBuild {
  const plist = resolve(appPath, 'Info.plist');
  return {
    bundleId: plistValue(plist, 'CFBundleIdentifier'),
    version: plistValue(plist, 'CFBundleShortVersionString'),
    build: plistValue(plist, 'CFBundleVersion'),
  };
}

export function installedIosAppBuild(udid: string): IosAppBuild {
  const temp = mkdtempSync(join(tmpdir(), 'showpass-ios-build-'));
  const resultFile = join(temp, 'apps.json');
  try {
    try {
      execFileSync(
        'xcrun',
        [
          'devicectl',
          'device',
          'info',
          'apps',
          '--device',
          udid,
          '--bundle-id',
          expectedIosAppBuild.bundleId,
          '--json-output',
          resultFile,
        ],
        { encoding: 'utf8', timeout: timeoutMs.simulatorCommand, stdio: ['ignore', 'pipe', 'pipe'] },
      );
    } catch (error) {
      throw new Error(`Could not inspect iPhone ${udid}. Connect, unlock, and trust the device in Xcode.`, {
        cause: error,
      });
    }
    const parsed = JSON.parse(readFileSync(resultFile, 'utf8')) as {
      result?: { apps?: { bundleIdentifier: string; version: string; bundleVersion: string }[] };
    };
    const app = parsed.result?.apps?.find((item) => item.bundleIdentifier === expectedIosAppBuild.bundleId);
    if (!app) throw new Error(`Showpass Beta ${expectedIosAppBuild.bundleId} is not installed on ${udid}.`);
    return { bundleId: app.bundleIdentifier, version: app.version, build: app.bundleVersion };
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

export function verifyIosAppBuild({ udid, appPath }: { udid: string; appPath?: string }): IosAppBuild {
  const actual = appPath ? appBuildAtPath(appPath) : installedIosAppBuild(udid);
  assertIosAppBuild(actual);
  return actual;
}
