import { browser } from '@wdio/globals';
import { iosGuestCheckoutPage } from '@screens/ios/buyer/checkout.ts';
import { openEventCheckout } from '@flows/ios/buyer/open-event-checkout.ts';
import type { PurchaseScenario } from '@shared/purchase/scenario.ts';
import { paymentWebviewPage } from '@screens/webview/buyer/payment.ts';

// UI flow only. The spec owns invoice/ticket verification so another platform can reuse it.
export async function preparePublicPurchase(
  guest: { name: string; email: string; phone: string },
  scenario: PurchaseScenario,
) {
  const webview = await openEventCheckout({ scenario });
  await iosGuestCheckoutPage.advanceGuestToCreditCard(guest);
  await iosGuestCheckoutPage.fillCard(scenario.testCard);

  await browser.switchContext(webview);
  return paymentWebviewPage.prepare(scenario);
}
