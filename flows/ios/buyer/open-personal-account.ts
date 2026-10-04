import assert from 'node:assert/strict';
import { browser } from '@wdio/globals';
import { appId, timeoutMs } from '@config/test-settings.ts';
import { iosLoginPage } from '@screens/ios/auth/login.ts';
import { buyerAccountPage } from '@screens/ios/buyer/account.ts';
import { buyerBottomBar, buyerTabPages } from '@screens/ios/buyer/bottom-navigation.ts';
import { mainMenuPage } from '@screens/ios/main-menu.ts';

export async function openPersonalBuyerAccount(): Promise<void> {
  const email = process.env.SHOWPASS_PERSONAL_EMAIL;
  const password = process.env.SHOWPASS_PERSONAL_PASSWORD;
  assert.ok(
    email && password,
    'Set SHOWPASS_PERSONAL_EMAIL and SHOWPASS_PERSONAL_PASSWORD for this temporary local test.',
  );
  await browser.activateApp(appId);
  await buyerBottomBar.open('Account');
  assert.ok(
    await buyerAccountPage.login.isDisplayed(),
    'Start signed out; use RESET_APP=1 to clear the previous simulator session.',
  );
  await buyerAccountPage.openLogin();
  await iosLoginPage.signIn(email, password);
  await browser.waitUntil(
    async () =>
      (await buyerAccountPage.personalInfo.isDisplayed()) || (await mainMenuPage.title.isDisplayed()),
    { timeout: timeoutMs.customerLogin, timeoutMsg: 'Login did not reach the authenticated buyer app.' },
  );
  if (await mainMenuPage.title.isDisplayed()) {
    await mainMenuPage.openExplore();
    await buyerBottomBar.open('Account');
  }
  await buyerTabPages.waitFor('Personal info');
}
