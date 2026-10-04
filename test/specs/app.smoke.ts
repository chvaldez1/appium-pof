import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { $, browser } from '@wdio/globals';
import { appId, target, timeoutMs } from '../settings.ts';

const appStateRunningInForeground = 4;

describe('App setup', () => {
  it('puts the selected beta app in the foreground', async () => {
    await browser.activateApp(appId);
    await browser.waitUntil(
      async () => (await browser.queryAppState(appId)) === appStateRunningInForeground,
      {
        timeout: timeoutMs.uiNavigation,
        timeoutMsg: 'The app is not running in the foreground.',
      },
    );
    const alert = await browser.getAlertText().catch(() => '');
    if (/location/i.test(alert)) await browser.dismissAlert();
    if (target === 'ios-app') {
      await $('~Search location or event').waitForDisplayed({ timeout: timeoutMs.uiNavigation });
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
