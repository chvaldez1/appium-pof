import { browser, expect } from '@wdio/globals';
import { appId } from '@config/test-settings.ts';
import { buyerAccountPage } from '@screens/native/ios/buyer/account.ts';
import { buyerBottomBar } from '@screens/native/ios/buyer/bottom-navigation.ts';
import { iosLoginPage } from '@screens/native/ios/auth/login.ts';

describe('iPhone login screen', () => {
  it('opens Account → Login and shows the email field', async () => {
    await browser.activateApp(appId);
    await buyerBottomBar.open('Account');
    await buyerAccountPage.openLogin();
    await iosLoginPage.waitForOpen();
    await expect(iosLoginPage.email).toBeDisplayed();
  });
});
