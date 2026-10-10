import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { browser } from '@wdio/globals';
import { iosGuestCheckoutPage } from '@screens/native/ios/buyer/checkout.ts';
import { openEventCheckout } from '@flows/buyer/ios/open-event-checkout.ts';
import { adultTicketPurchase } from '@data/purchase-scenario.ts';
import { target } from '@config/test-settings.ts';

const output = resolve('artifacts', target, 'discovery');

async function capture(name: string) {
  mkdirSync(output, { recursive: true });
  writeFileSync(resolve(output, `${name}.xml`), await browser.getPageSource());
  await browser.saveScreenshot(resolve(output, `${name}.png`));
}

describe('Public event discovery', () => {
  it('opens Comic Con from native search', async () => {
    await openEventCheckout({
      scenario: adultTicketPurchase,
      capture,
      onEventWebview: async () => {
        writeFileSync(resolve(output, 'contexts.json'), JSON.stringify(await browser.getContexts(), null, 2));
        writeFileSync(resolve(output, 'event.html'), await browser.getPageSource());
      },
    });

    if (process.env.PUBLIC_CHECKOUT_MODE === 'guest') {
      if (process.env.PUBLIC_GUEST_EMAIL) {
        if (!process.env.PUBLIC_GUEST_PHONE) {
          throw new Error('Set PUBLIC_GUEST_PHONE for the required guest phone field.');
        }
        await iosGuestCheckoutPage.advanceGuestToCreditCard({
          name: process.env.PUBLIC_GUEST_NAME || 'Appium QA',
          email: process.env.PUBLIC_GUEST_EMAIL,
          phone: process.env.PUBLIC_GUEST_PHONE,
        });
        await iosGuestCheckoutPage.openManualAddress();
      } else {
        await iosGuestCheckoutPage.startGuest();
        await capture('guest-next');
      }
    } else if (process.env.SHOWPASS_CUSTOMER_EMAIL && process.env.SHOWPASS_CUSTOMER_PASSWORD) {
      await iosGuestCheckoutPage.signInCustomer(
        process.env.SHOWPASS_CUSTOMER_EMAIL,
        process.env.SHOWPASS_CUSTOMER_PASSWORD,
      );
    }
  });
});
