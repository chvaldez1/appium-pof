import { $, browser } from '@wdio/globals';
import { timeoutMs } from '@config/test-settings.ts';

class EventWebviewPage {
  get buyTickets() {
    return $(
      '//button[contains(translate(normalize-space(.),"abcdefghijklmnopqrstuvwxyz","ABCDEFGHIJKLMNOPQRSTUVWXYZ"),"BUY TICKETS")]',
    );
  }

  async waitForEvent(eventUrl: string): Promise<void> {
    const expected = new URL(eventUrl);
    await browser.waitUntil(
      async () => {
        const actual = new URL(await browser.getUrl());
        return actual.origin === expected.origin && actual.pathname === expected.pathname;
      },
      { timeout: timeoutMs.pageLoad, timeoutMsg: 'The expected event URL did not load.' },
    );
    await this.buyTickets.waitForDisplayed({ timeout: timeoutMs.pageLoad });
  }

  async openTicketPicker(): Promise<void> {
    await this.buyTickets.waitForDisplayed({ timeout: timeoutMs.uiNavigation });
    await this.buyTickets.click();
  }
}

export const eventWebviewPage = new EventWebviewPage();
