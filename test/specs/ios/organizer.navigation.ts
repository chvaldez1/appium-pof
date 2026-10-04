import { browser } from '@wdio/globals';
import { openOrganizerDashboard } from '../../flows/ios/organizer/open-dashboard.ts';
import { openOrganizerDestination, organizerDestinations } from '../../screens/ios/organizer/dashboard.ts';
import { appId } from '../../settings.ts';

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
      await openOrganizerDestination(destination);
    });
  }
});
