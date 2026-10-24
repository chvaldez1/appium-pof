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

  screen(destination: OrganizerDestination) {
    return $(`~${destination.screen}`);
  }

  content(destination: OrganizerDestination) {
    if (!destination.content) throw new Error('This destination has no content marker.');
    return $(`~${destination.tile === 'Check in' ? 'Events Events' : destination.content}`);
  }

  async open(destination: OrganizerDestination): Promise<void> {
    for (let attempt = 0; attempt < 5 && !(await this.tile(destination.tile).isDisplayed()); attempt += 1) {
      await browser.execute('mobile: scroll', { direction: 'down' });
    }
    await this.tile(destination.tile).waitForDisplayed({ timeout: timeoutMs.uiControl });
    await this.tile(destination.neighbor).waitForDisplayed({ timeout: timeoutMs.uiControl });
    await this.tile(destination.tile).click();
    await this.tile(destination.neighbor).waitForDisplayed({
      reverse: true,
      timeout: timeoutMs.uiNavigation,
    });
  }
}

export const organizerDashboardPage = new OrganizerDashboardPage();
