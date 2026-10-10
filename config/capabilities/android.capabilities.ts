import { requiredSetting } from '@config/local-env.ts';
import { target, appiumCommandTimeoutSeconds, timeoutMs } from '@config/test-settings.ts';
import { appCapabilities, resolveAppPath } from '@config/capabilities/app.ts';

// Preserves the existing Android targets; no Android journey is implemented yet.
export function createAndroidCapabilities(): WebdriverIO.Capabilities {
  return {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:udid': requiredSetting('ANDROID_SERIAL', target),
    'appium:newCommandTimeout': appiumCommandTimeoutSeconds,
    'appium:adbExecTimeout': timeoutMs.pageLoad,
    ...appCapabilities(resolveAppPath('.apk')),
    'appium:appWaitActivity': '*',
    ...(target.endsWith('-webview')
      ? { 'appium:ensureWebviewsHavePages': true, 'appium:enableWebviewDetailsCollection': true }
      : {}),
  };
}
