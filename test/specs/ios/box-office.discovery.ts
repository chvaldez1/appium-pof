import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { $, browser } from '@wdio/globals';
import { appId, timeoutMs } from '../../settings.ts';

describe('iPhone Point of sale discovery', () => {
  it('opens employee login from Account', async () => {
    const output = resolve('artifacts/ios-app/box-office/discovery');
    mkdirSync(output, { recursive: true });
    await browser.activateApp(appId);
    writeFileSync(resolve(output, 'explore.xml'), await browser.getPageSource());
    const account = await $('//XCUIElementTypeButton[contains(@name,"Account")]');
    await account.waitForDisplayed({ timeout: timeoutMs.uiNavigation });
    await account.click();
    writeFileSync(resolve(output, 'account.xml'), await browser.getPageSource());
    await browser.saveScreenshot(resolve(output, 'account.png'));
    const login = await $('~Login');
    await login.waitForDisplayed({ timeout: timeoutMs.uiNavigation });
    await login.click();
    const email = await $('//XCUIElementTypeTextField[contains(@name,"Email")]');
    try {
      await email.waitForDisplayed({ timeout: timeoutMs.uiNavigation });
    } catch (error) {
      if ((await browser.queryAppState(appId)) !== 4) {
        throw new Error('Showpass Beta exited after tapping Login, before the email form opened.', {
          cause: error,
        });
      }
      throw error;
    }
    writeFileSync(resolve(output, 'login.xml'), await browser.getPageSource());
    await browser.saveScreenshot(resolve(output, 'login.png'));
  });
});
