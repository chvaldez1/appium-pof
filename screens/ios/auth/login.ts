import { $, browser } from '@wdio/globals';
import { appId, applicationState, timeoutMs } from '@config/test-settings.ts';
import { enterIosText } from '@shared/ios/text-input.ts';

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
      if ((await browser.queryAppState(appId)) !== applicationState.runningInForeground) {
        throw new Error('Showpass Beta exited after tapping Login, before the email form opened.', {
          cause: error,
        });
      }
      throw error;
    }
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.waitForOpen();
    await enterIosText(await this.email, email);
    await this.password.setValue(password);
    await this.submit.click();
  }
}

export const iosLoginPage = new IosLoginPage();
