import { existsSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { requiredSetting } from '@config/local-env.ts';
import { appId, target } from '@config/test-settings.ts';

export function resolveAppPath(extension: '.app' | '.apk', reuseInstalledApp = false): string | undefined {
  if (reuseInstalledApp) return undefined;
  const app = resolve(requiredSetting('APP_PATH', target));
  if (!existsSync(app)) throw new Error(`APP_PATH does not exist: ${app}`);
  if (extname(app) !== extension) throw new Error(`Use a ${extension} build for this target.`);
  return app;
}

export function appCapabilities(app: string | undefined): WebdriverIO.Capabilities {
  return {
    ...(app ? { 'appium:app': app, 'appium:enforceAppInstall': true } : {}),
    'appium:noReset': process.env.RESET_APP !== '1',
    'appium:fullReset': false,
    'appium:autoWebview': false,
    [target.startsWith('ios-') ? 'appium:bundleId' : 'appium:appPackage']: appId,
  };
}
