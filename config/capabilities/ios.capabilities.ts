import { requiredSetting } from '@config/local-env.ts';
import { target, appiumCommandTimeoutSeconds, timeoutMs } from '@config/test-settings.ts';
import { verifyIosAppBuild } from '@config/ios-app-build.ts';
import { appCapabilities, resolveAppPath } from '@config/capabilities/app.ts';

export function createIosCapabilities(): WebdriverIO.Capabilities {
  const udid = requiredSetting('IOS_UDID', target);
  console.log(`Selected iOS device: ${udid}.`);
  const capabilities: WebdriverIO.Capabilities = {
    platformName: 'iOS',
    'appium:automationName': 'XCUITest',
    'appium:udid': udid,
    'appium:newCommandTimeout': appiumCommandTimeoutSeconds,
    'appium:wdaLaunchTimeout': timeoutMs.wdaLaunch,
  };
  if (!target.endsWith('-app') && !target.endsWith('-webview')) {
    capabilities.browserName = 'Safari';
    return capabilities;
  }
  const app = resolveAppPath('.app', process.env.REUSE_INSTALLED_APP === '1');
  if (target === 'ios-app') {
    const build = verifyIosAppBuild({ udid, appPath: app });
    console.log(`Showpass Beta build verified: ${build.version} (${build.build}).`);
  }
  return {
    ...capabilities,
    ...appCapabilities(app),
    'appium:forceAppLaunch': true,
    // WKWebView's inspector may report a bundle ID different from the app ID.
    'appium:additionalWebviewBundleIds': ['*'],
  };
}
