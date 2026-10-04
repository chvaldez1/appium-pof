import { browser } from '@wdio/globals';
import { appId } from '../../../settings.ts';
import { buyerBottomBar, ordersHomePage } from '../../../screens/ios/buyer/bottom-navigation.ts';

export async function openOrdersHome(): Promise<void> {
  await buyerBottomBar.open('Orders');
  if (await ordersHomePage.universalQr.isDisplayed()) return;
  // A nested Orders stack can survive tab reselection. Restart only then.
  await browser.terminateApp(appId);
  await browser.activateApp(appId);
  await buyerBottomBar.open('Orders');
  await ordersHomePage.waitForOpen();
}
