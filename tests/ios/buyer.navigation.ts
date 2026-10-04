import { openPersonalBuyerAccount } from '@flows/ios/buyer/open-personal-account.ts';
import { openOrdersHome } from '@flows/ios/buyer/open-orders-home.ts';
import { waitForAccountWebview } from '@flows/ios/buyer/wait-for-account-webview.ts';
import { buyerBottomBar, buyerTabPages, ordersHomePage } from '@screens/ios/buyer/bottom-navigation.ts';
import { buyerTabs, orderDestinations } from '@shared/data/buyer-navigation.ts';

/**
 * TODO — DELETE PERSONAL ACCOUNT TEST AFTER THIS TEMPORARY QA PASS.
 * Remove this spec, its npm command, and the matching QA-vault note when a
 * dedicated disposable buyer fixture replaces the personal-account run.
 * Never put the personal email/password in source, JUnit, screenshots, or CI.
 */
describe('Temporary personal-account iPhone buyer navigation', () => {
  before(async () => {
    await openPersonalBuyerAccount();
  });

  for (const { tab, proof } of buyerTabs) {
    it(`opens the ${tab} bottom tab and renders its screen`, async () => {
      await buyerBottomBar.open(tab);
      await buyerBottomBar.waitForAllTabs();
      await buyerTabPages.waitFor(proof);
      if (tab === 'Upcoming') {
        if (await buyerTabPages.noUpcomingEvents.isDisplayed()) return;
        await waitForAccountWebview('/account/upcoming/');
      }
    });
  }

  for (const { title, path } of orderDestinations) {
    it(`opens Orders → ${title} and renders its WebView`, async () => {
      await openOrdersHome();
      await ordersHomePage.openLink(title);
      await waitForAccountWebview(path);
      await buyerBottomBar.waitForAllTabs();
    });
  }

  it('opens Orders → Credits and renders the native screen', async () => {
    await openOrdersHome();
    await ordersHomePage.openLink('Credits');
    await buyerTabPages.waitFor('Credits');
    await buyerBottomBar.waitForAllTabs();
  });
});
