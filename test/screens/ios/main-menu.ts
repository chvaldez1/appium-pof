import { $ } from '@wdio/globals';
import { timeoutMs } from '../../settings.ts';

class MainMenuPage {
  get title() {
    return $('~Main menu');
  }

  get dashboard() {
    return $('~Dashboard');
  }

  get explore() {
    return $('~Explore');
  }

  get login() {
    return $('~Login');
  }

  async openDashboard(): Promise<void> {
    await this.dashboard.waitForDisplayed({ timeout: timeoutMs.uiNavigation });
    await this.dashboard.click();
  }

  async openExplore(): Promise<void> {
    await this.explore.waitForDisplayed({ timeout: timeoutMs.uiNavigation });
    await this.explore.click();
  }

  async openLogin(): Promise<void> {
    await this.login.waitForDisplayed({ timeout: timeoutMs.uiNavigation });
    await this.login.click();
  }
}

export const mainMenuPage = new MainMenuPage();
