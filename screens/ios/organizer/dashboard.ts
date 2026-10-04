import assert from 'node:assert/strict';
import { $, browser } from '@wdio/globals';
import { timeoutMs } from '@config/test-settings.ts';
import { type OrganizerDestination } from '@shared/data/organizer-navigation.ts';

class OrganizerDashboardPage {
  get prompt() {
    return $('~What would you like to do?');
  }

  tile(label: string) {
    return $(`~${label}`);
  }

  async open(destination: OrganizerDestination): Promise<void> {
    for (let attempt = 0; attempt < 5 && !(await this.tile(destination.tile).isDisplayed()); attempt += 1) {
      await browser.execute('mobile: scroll', { direction: 'down' });
    }
    assert.ok(
      await this.tile(destination.tile).isDisplayed(),
      `${destination.tile} is absent or inaccessible on the dashboard.`,
    );
    await this.tile(destination.neighbor).waitForDisplayed({ timeout: timeoutMs.uiControl });
    await this.tile(destination.tile).click();
    await this.tile(destination.neighbor).waitForExist({ reverse: true, timeout: timeoutMs.uiNavigation });
    await $(`~${destination.screen}`).waitForDisplayed({ timeout: timeoutMs.uiNavigation });
    if (destination.content) {
      await $(`~${destination.content}`).waitForDisplayed({ timeout: timeoutMs.pageLoad });
    }
  }
}

export const organizerDashboardPage = new OrganizerDashboardPage();
