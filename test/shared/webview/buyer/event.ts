import assert from 'node:assert/strict';
import { $, browser } from '@wdio/globals';
import { timeoutMs } from '../../../settings.ts';

class EventWebviewPage {
  get buyTickets() {
    return $(
      '//button[contains(translate(normalize-space(.),"abcdefghijklmnopqrstuvwxyz","ABCDEFGHIJKLMNOPQRSTUVWXYZ"),"BUY TICKETS")]',
    );
  }

  async waitForEvent(eventUrl: string): Promise<void> {
    assert.ok((await browser.getUrl()).startsWith(eventUrl));
  }

  async openTicketPicker(): Promise<void> {
    await this.buyTickets.waitForDisplayed({ timeout: timeoutMs.uiNavigation });
    await this.buyTickets.click();
  }
}

export const eventWebviewPage = new EventWebviewPage();
