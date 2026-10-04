import { $ } from '@wdio/globals';
import { timeoutMs } from '../../../settings.ts';

class BuyerAccountPage {
  get login() {
    return $('~Login');
  }

  get personalInfo() {
    return $('~Personal info');
  }

  async openLogin(): Promise<void> {
    await this.login.waitForDisplayed({ timeout: timeoutMs.uiNavigation });
    await this.login.click();
  }
}

export const buyerAccountPage = new BuyerAccountPage();
