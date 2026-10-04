import { $, browser } from '@wdio/globals';
import { appId, timeoutMs } from '../../../settings.ts';

class IosLoginPage {
  get email() {
    return $('//XCUIElementTypeTextField[contains(@name,"Email")]');
  }

  get password() {
    return $('//XCUIElementTypeSecureTextField[contains(@name,"Password")]');
  }

  get submit() {
    return $('//XCUIElementTypeButton[@name="Login"]');
  }

  async waitForOpen(): Promise<void> {
    try {
      await this.email.waitForDisplayed({ timeout: timeoutMs.uiNavigation });
    } catch (error) {
      if ((await browser.queryAppState(appId)) !== 4) {
        throw new Error('Showpass Beta exited after tapping Login, before the email form opened.', {
          cause: error,
        });
      }
      throw error;
    }
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.waitForOpen();
    await this.email.setValue(email);
    await this.password.setValue(password);
    await this.submit.click();
  }
}

export const iosLoginPage = new IosLoginPage();
