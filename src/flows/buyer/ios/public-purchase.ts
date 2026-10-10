import { browser } from '@wdio/globals';
import { iosGuestCheckoutPage } from '@screens/native/ios/buyer/checkout.ts';
import { openEventCheckout } from '@flows/buyer/ios/open-event-checkout.ts';
import type { PurchaseScenario } from '@data/purchase-scenario.ts';
import { paymentWebviewPage } from '@screens/webviews/buyer/payment.ts';

// UI flow only. The spec owns invoice/ticket verification so another platform can reuse it.
export async function preparePublicPurchase(
  guest: { name: string; email: string; phone: string },
  scenario: PurchaseScenario,
) {
  const webview = await openEventCheckout({ scenario });
  console.log('Public checkout: entering guest details and the test payment method.');
  await iosGuestCheckoutPage.advanceGuestToCreditCard(guest);
  await iosGuestCheckoutPage.fillCard(scenario.testCard);

  await browser.switchContext(webview);
  console.log('Public checkout: checking the total before payment.');
  return paymentWebviewPage.prepare(scenario);
}
