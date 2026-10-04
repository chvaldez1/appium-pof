import { $, browser } from '@wdio/globals';
import { appId, timeoutMs } from '../../../settings.ts';

export async function waitForIphoneLoginForm(): Promise<void> {
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
}

export async function submitIphoneLogin(email: string, password: string): Promise<void> {
  await waitForIphoneLoginForm();
  await $('//XCUIElementTypeTextField[contains(@name,"Email")]').setValue(email);
  await $('//XCUIElementTypeSecureTextField[contains(@name,"Password")]').setValue(password);
  await $('//XCUIElementTypeButton[@name="Login"]').click();
}
