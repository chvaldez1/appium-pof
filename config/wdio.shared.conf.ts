import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { target, baseURL, timeoutMs } from '@config/test-settings.ts';
import { projectRoot } from '@config/project-paths.ts';
import { defaultSpecForTarget } from '@config/specs.ts';
import { createSessionHooks } from '@setup/session-hooks.ts';

const targets = ['desktop-safari', 'ios-safari', 'ios-app', 'android-app', 'ios-webview', 'android-webview'];
if (!targets.includes(target)) throw new Error(`Unknown TARGET: ${target}`);
const isAndroid = target.startsWith('android-');
const isWebView = target.endsWith('-webview');
const purchaseRun = process.env.PURCHASE_RUN === '1';
const organizerNavigationRun = process.env.ORGANIZER_NAVIGATION_RUN === '1';
const buyerNavigationRun = process.env.BUYER_NAVIGATION_RUN === '1';
const sensitiveRun = purchaseRun || organizerNavigationRun || buyerNavigationRun;
if (!isAndroid && process.platform !== 'darwin') {
  throw new Error(`${target} requires macOS on the Appium host.`);
}

export function createSharedConfig(
  capabilities: WebdriverIO.Capabilities,
  driver: 'xcuitest' | 'uiautomator2' | 'safari',
): WebdriverIO.Config {
  const output = resolve(
    process.env.APPIUM_SESSION_ARTIFACT_DIR ?? process.env.APPIUM_ARTIFACT_DIR ?? `artifacts/${target}`,
  );
  for (const folder of ['appium', 'wdio', 'junit', 'screenshots']) {
    mkdirSync(resolve(output, folder), { recursive: true });
  }
  const serverArgs: {
    address: string;
    useDrivers: string;
    logLevel: string;
    config?: string;
    allowInsecure?: string;
  } = {
    address: '127.0.0.1',
    useDrivers: driver,
    // The service detects readiness from Appium's INFO listener message.
    logLevel: 'info',
    ...(sensitiveRun ? { config: './config/appium-sensitive.json' } : {}),
  };
  if (isAndroid && isWebView) {
    serverArgs.allowInsecure = 'uiautomator2:chromedriver_autodownload';
  }
  return {
    runner: 'local',
    rootDir: projectRoot,
    tsConfigPath: resolve(projectRoot, 'tsconfig.json'),
    hostname: '127.0.0.1',
    port: 4723,
    path: '/',
    maxInstances: 1,
    specs: [defaultSpecForTarget(target)],
    exclude: [resolve(projectRoot, 'tests/unit/**')],
    capabilities: [capabilities],
    baseUrl: baseURL,
    logLevel: sensitiveRun ? 'error' : 'info',
    outputDir: resolve(output, 'wdio'),
    waitforTimeout: timeoutMs.uiNavigation,
    connectionRetryTimeout: timeoutMs.connectionRetry,
    connectionRetryCount: 0,
    framework: 'mocha',
    mochaOpts: { ui: 'bdd', timeout: purchaseRun ? timeoutMs.mochaPurchase : timeoutMs.mochaSmoke },
    services:
      process.env.APPIUM_SERVER === 'external'
        ? []
        : [
            [
              'appium',
              {
                logPath: resolve(output, 'appium'),
                appiumStartTimeout: timeoutMs.appiumStart,
                args: serverArgs,
              },
            ],
          ],
    reporters: [
      'spec',
      [
        'junit',
        {
          outputDir: resolve(output, 'junit'),
          outputFileFormat: ({ cid }) => `${target}-${cid}.xml`,
        },
      ],
    ],
    ...createSessionHooks({ target, output, sensitiveRun }),
  };
}
