import { $, browser } from '@wdio/globals';
import { continueGuestToCreditCard } from '../../../screens/ios/buyer/checkout.ts';
import { openEventCheckout } from '../../../screens/ios/buyer/explore.ts';
import type { PurchaseScenario } from '../../../shared/purchase/scenario.ts';
import { prepareWebviewPayment } from '../../../shared/webview/buyer/payment.ts';

// UI flow only. The spec owns invoice/ticket verification so another platform can reuse it.
export async function preparePublicPurchase(
  guest: { name: string; email: string; phone: string },
  scenario: PurchaseScenario,
) {
  const webview = await openEventCheckout({ scenario });
  await continueGuestToCreditCard({
    webview,
    guestName: guest.name,
    guestEmail: guest.email,
    guestPhone: guest.phone,
  });
  const card = scenario.testCard;
  await $('//XCUIElementTypeTextField[@placeholderValue="Name on card"]').setValue(card.nameOnCard);
  await $('//XCUIElementTypeTextField[@name="Credit or debit card number"]').setValue(card.number);
  await $('//XCUIElementTypeTextField[@name="Credit or debit card expiration date"]').setValue(card.expiry);
  await $('//XCUIElementTypeTextField[@name="Credit or debit card CVC/CVV"]').setValue(card.cvc);

  await browser.switchContext(webview);
  return prepareWebviewPayment(scenario);
}
