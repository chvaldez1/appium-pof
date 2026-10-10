import assert from 'node:assert/strict';
import { $, browser } from '@wdio/globals';
import { timeoutMs } from '@config/test-settings.ts';

class IosEventDetailsPage {
  get buyTickets() {
    return $('~BUY TICKETS');
  }

  async waitForEvent(name: string): Promise<void> {
    await this.buyTickets.waitForDisplayed({ timeout: timeoutMs.pageLoad });
    assert.ok((await browser.getPageSource()).includes(name), `The ${name} event did not open.`);
  }
}

export const iosEventDetailsPage = new IosEventDetailsPage();
