import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { browser } from '@wdio/globals';
import { appId } from '../../settings.ts';
import { buyerAccountPage } from '../../screens/ios/buyer/account.ts';
import { buyerBottomBar } from '../../screens/ios/buyer/bottom-navigation.ts';
import { iosLoginPage } from '../../screens/ios/auth/login.ts';

describe('iPhone Point of sale discovery', () => {
  it('opens employee login from Account', async () => {
    const output = resolve('artifacts/ios-app/box-office/discovery');
    mkdirSync(output, { recursive: true });
    await browser.activateApp(appId);
    writeFileSync(resolve(output, 'explore.xml'), await browser.getPageSource());
    await buyerBottomBar.open('Account');
    writeFileSync(resolve(output, 'account.xml'), await browser.getPageSource());
    await browser.saveScreenshot(resolve(output, 'account.png'));
    await buyerAccountPage.openLogin();
    await iosLoginPage.waitForOpen();
    writeFileSync(resolve(output, 'login.xml'), await browser.getPageSource());
    await browser.saveScreenshot(resolve(output, 'login.png'));
  });
});
