import { $ } from '@wdio/globals';
import { timeoutMs } from '@config/test-settings.ts';
import { buyerTabs, type BuyerTab } from '@shared/data/buyer-navigation.ts';

class BuyerBottomBar {
  tab(name: BuyerTab) {
    return $(`//XCUIElementTypeButton[contains(@name," ${name}")]`);
  }

  async open(name: BuyerTab): Promise<void> {
    await this.tab(name).waitForDisplayed({ timeout: timeoutMs.uiNavigation });
    await this.tab(name).click();
  }

  async waitForAllTabs(): Promise<void> {
    for (const { tab } of buyerTabs) {
      await this.tab(tab).waitForDisplayed({ timeout: timeoutMs.uiControl });
    }
  }
}

class BuyerTabPages {
  screen(proof: string) {
    return $(`~${proof}`);
  }

  get noUpcomingEvents() {
    return this.screen('No upcoming events yet');
  }

  async waitFor(proof: string): Promise<void> {
    await this.screen(proof).waitForDisplayed({ timeout: timeoutMs.pageLoad });
  }
}

class OrdersHomePage {
  get universalQr() {
    return $('~Universal QR Code');
  }

  link(title: string) {
    return $(`~${title}`);
  }

  async waitForOpen(): Promise<void> {
    await this.universalQr.waitForDisplayed({ timeout: timeoutMs.pageLoad });
  }

  async openLink(title: string): Promise<void> {
    await this.link(title).waitForDisplayed({ timeout: timeoutMs.uiControl });
    await this.link(title).click();
  }
}

export const buyerBottomBar = new BuyerBottomBar();
export const buyerTabPages = new BuyerTabPages();
export const ordersHomePage = new OrdersHomePage();
