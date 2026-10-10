import assert from 'node:assert/strict';
import { $, browser } from '@wdio/globals';
import { timeoutMs } from '@config/test-settings.ts';
import { type OrganizerDestination } from '@data/static/organizer-navigation.ts';

const tileAccessibilityNames: Record<OrganizerDestination['tile'], string> = {
  'Check in': 'check-in-icon Check in',
  'Point of sale': 'box-office-icon Point of sale',
  'Manage events': 'manage-event-icon Manage events',
  'Event stats': 'event-stats-icon Event stats',
  Employees: 'employees-icon Employees',
  'My stats': 'my-stats-icon My stats',
  Guestlist: 'guestlist-icon Guestlist',
  'Product stats': 'product-stats-icon Product stats',
};

class OrganizerDashboardPage {
  get prompt() {
    return $('~What would you like to do?');
  }

  tile(label: OrganizerDestination['tile']) {
    return $(`~${tileAccessibilityNames[label]}`);
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
      const contentName = destination.tile === 'Check in' ? 'Events Events' : destination.content;
      await $(`~${contentName}`).waitForDisplayed({ timeout: timeoutMs.pageLoad });
    }
  }
}

export const organizerDashboardPage = new OrganizerDashboardPage();
