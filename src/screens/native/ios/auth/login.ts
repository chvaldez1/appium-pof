import { $, browser } from '@wdio/globals';
import { appId, applicationState, timeoutMs } from '@config/test-settings.ts';
import { enterIosText } from '@support/input/ios-text-input.ts';

class IosLoginPage {
  get welcome() {
    return $('~Welcome Back');
  }

  get email() {
    return $('//XCUIElementTypeTextField[contains(@name,"Email") or @value="Email address"]');
  }

  get password() {
    return $('//XCUIElementTypeSecureTextField[contains(@name,"Password") or @value="Password"]');
  }

  get submit() {
    return $('~Login');
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
    if (await browser.isKeyboardShown()) {
      await this.welcome.click();
      await browser.waitUntil(async () => !(await browser.isKeyboardShown()), {
        timeout: timeoutMs.uiControl,
        timeoutMsg: 'The login keyboard did not close before submission.',
      });
    }
    await this.submit.click();
  }
}

export const iosLoginPage = new IosLoginPage();
