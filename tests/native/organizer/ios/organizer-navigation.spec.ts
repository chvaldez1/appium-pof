import { browser } from '@wdio/globals';
import { openOrganizerDashboard } from '@flows/organizer/ios/open-dashboard.ts';
import { organizerDashboardPage } from '@screens/native/ios/organizer/dashboard.ts';
import { organizerDestinations } from '@data/static/organizer-navigation.ts';
import { appId } from '@config/test-settings.ts';

describe('iPhone organizer dashboard navigation', () => {
  let firstDestination = true;

  before(async () => {
    await openOrganizerDashboard({ allowLogin: true });
  });

  beforeEach(async () => {
    if (firstDestination) {
      firstDestination = false;
      return;
    }
    await browser.terminateApp(appId);
    await openOrganizerDashboard({ allowLogin: false });
  });

  for (const destination of organizerDestinations) {
    it(`opens ${destination.tile} and renders its screen`, async () => {
      await organizerDashboardPage.open(destination);
    });
  }
});
