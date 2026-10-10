import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { browser } from '@wdio/globals';
import { iosExplorePage } from '@screens/native/ios/buyer/explore.ts';
import { appId, target, timeoutMs } from '@config/test-settings.ts';

const appStateRunningInForeground = 4;

describe('Showpass app launch', () => {
  it('opens the app and renders its first screen', async () => {
    await browser.activateApp(appId);
    await browser.waitUntil(
      async () => (await browser.queryAppState(appId)) === appStateRunningInForeground,
      {
        timeout: timeoutMs.uiNavigation,
        timeoutMsg: 'The app is not running in the foreground.',
      },
    );
    if (target === 'ios-app') {
      await iosExplorePage.searchButton.waitForDisplayed({ timeout: timeoutMs.uiNavigation });
    }
    const pageSource = await browser.getPageSource();
    assert.ok(pageSource.length > 0);
    if (process.env.CAPTURE_UI_TREE === '1') {
      const output = resolve(process.env.APPIUM_ARTIFACT_DIR ?? `artifacts/${target}`);
      mkdirSync(output, { recursive: true });
      writeFileSync(resolve(output, 'startup-page-source.xml'), pageSource);
    }
  });
});
