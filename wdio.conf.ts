import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { target, baseURL, appId, appiumCommandTimeoutSeconds, timeoutMs } from '@config/test-settings.ts';
import { verifyIosAppBuild } from '@scripts/ios-app-build.ts';
import { dismissOptionalLocationPrompt } from '@shared/ios/system-prompts.ts';

const targets = ['desktop-safari', 'ios-safari', 'ios-app', 'android-app', 'ios-webview', 'android-webview'];
if (!targets.includes(target)) throw new Error(`Unknown TARGET: ${target}`);
const isIOS = target.startsWith('ios-');
const isAndroid = target.startsWith('android-');
const isWebView = target.endsWith('-webview');
const isApp = target.endsWith('-app') || isWebView;
const purchaseRun = process.env.PURCHASE_RUN === '1';
const organizerNavigationRun = process.env.ORGANIZER_NAVIGATION_RUN === '1';
const buyerNavigationRun = process.env.BUYER_NAVIGATION_RUN === '1';
const sensitiveRun = purchaseRun || organizerNavigationRun || buyerNavigationRun;
if (!isAndroid && process.platform !== 'darwin') {
  throw new Error(`${target} requires macOS on the Appium host.`);
}
const required = (name: string): string => {
  if (!process.env[name]) throw new Error(`Set ${name} before running ${target}.`);
  return process.env[name];
};
const output = resolve(
  process.env.APPIUM_SESSION_ARTIFACT_DIR ?? process.env.APPIUM_ARTIFACT_DIR ?? `artifacts/${target}`,
);
for (const folder of ['appium', 'wdio', 'junit', 'screenshots']) {
  mkdirSync(resolve(output, folder), { recursive: true });
}

let capabilities: WebdriverIO.Capabilities;
if (target === 'desktop-safari') {
  capabilities = {
    platformName: 'mac',
    browserName: 'Safari',
    'appium:automationName': 'Safari',
  };
} else if (isIOS) {
  capabilities = {
    platformName: 'iOS',
    'appium:automationName': 'XCUITest',
    'appium:udid': required('IOS_UDID'),
    'appium:newCommandTimeout': appiumCommandTimeoutSeconds,
    'appium:wdaLaunchTimeout': timeoutMs.wdaLaunch,
  };
  if (!isApp) capabilities.browserName = 'Safari';
} else {
  capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:udid': required('ANDROID_SERIAL'),
    'appium:newCommandTimeout': appiumCommandTimeoutSeconds,
    'appium:adbExecTimeout': timeoutMs.pageLoad,
  };
}
if (isApp) {
  const reuseInstalledApp = isIOS && process.env.REUSE_INSTALLED_APP === '1';
  let app: string | undefined;
  if (!reuseInstalledApp) {
    app = resolve(required('APP_PATH'));
    if (!existsSync(app)) throw new Error(`APP_PATH does not exist: ${app}`);
    const expectedExtension = isIOS ? '.app' : '.apk';
    if (extname(app) !== expectedExtension) {
      throw new Error(`Use a ${expectedExtension} build for this target.`);
    }
  }
  if (target === 'ios-app') {
    const build = verifyIosAppBuild({ udid: required('IOS_UDID'), appPath: app });
    console.log(`Showpass Beta build verified: ${build.version} (${build.build}).`);
  }
  Object.assign(capabilities, {
    ...(app ? { 'appium:app': app, 'appium:enforceAppInstall': true } : {}),
    'appium:noReset': process.env.RESET_APP !== '1',
    'appium:fullReset': false,
    'appium:autoWebview': false,
    [isIOS ? 'appium:bundleId' : 'appium:appPackage']: appId,
  });
  if (isIOS) {
    capabilities['appium:forceAppLaunch'] = true;
    // WKWebView's inspector may report a bundle ID different from the app ID.
    capabilities['appium:additionalWebviewBundleIds'] = ['*'];
  }
  if (isAndroid) capabilities['appium:appWaitActivity'] = '*';
}
if (isAndroid && isWebView) {
  capabilities['appium:ensureWebviewsHavePages'] = true;
  capabilities['appium:enableWebviewDetailsCollection'] = true;
}

const serverArgs: { address: string; useDrivers: string; logLevel: string; allowInsecure?: string } = {
  address: '127.0.0.1',
  useDrivers: isIOS ? 'xcuitest' : isAndroid ? 'uiautomator2' : 'safari',
  logLevel: sensitiveRun ? 'error' : 'info',
};
if (isAndroid && isWebView) {
  serverArgs.allowInsecure = 'uiautomator2:chromedriver_autodownload';
}
export const config: WebdriverIO.Config = {
  runner: 'local',
  hostname: '127.0.0.1',
  port: 4723,
  path: '/',
  maxInstances: 1,
  specs: [`./tests/${isWebView ? 'webview' : isApp ? 'app' : 'safari'}.smoke.ts`],
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
  before: async function () {
    if (target === 'ios-app') {
      verifyIosAppBuild({ udid: required('IOS_UDID') });
      await dismissOptionalLocationPrompt();
    }
    writeFileSync(
      resolve(output, 'session.json'),
      JSON.stringify(
        {
          target,
          node: process.version,
          platform: process.platform,
          architecture: process.arch,
          capabilities: browser.capabilities,
        },
        null,
        2,
      ),
    );
  },
  afterTest: async function (test, context, { passed }) {
    // These sessions enter card or account details; retain JUnit without command logs or UI captures.
    if (sensitiveRun) return;
    const name = test.title.replace(/[^a-z0-9-]/gi, '_').slice(0, 90);
    try {
      await browser.saveScreenshot(
        resolve(output, 'screenshots', `${Date.now()}-${passed ? 'pass' : 'fail'}-${name}.png`),
      );
    } catch (error) {
      console.warn(`Screenshot unavailable: ${String(error)}`);
    }
  },
};
