import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { $, browser } from '@wdio/globals';
import { checkoutStepText, continueGuestToCreditCard } from '../../screens/ios/buyer/checkout.ts';
import { openEventCheckout } from '../../screens/ios/buyer/explore.ts';
import { adultTicketPurchase } from '../../shared/purchase/scenario.ts';
import { target, timeoutMs } from '../../settings.ts';

const output = resolve('artifacts', target, 'discovery');

async function capture(name: string) {
  mkdirSync(output, { recursive: true });
  writeFileSync(resolve(output, `${name}.xml`), await browser.getPageSource());
  await browser.saveScreenshot(resolve(output, `${name}.png`));
}

describe('Public event discovery', () => {
  it('opens Comic Con from native search', async () => {
    const webview = await openEventCheckout({
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
        await continueGuestToCreditCard({
          webview,
          guestName: process.env.PUBLIC_GUEST_NAME || 'Appium QA',
          guestEmail: process.env.PUBLIC_GUEST_EMAIL,
          guestPhone: process.env.PUBLIC_GUEST_PHONE,
        });
        const manualAddress = await $('//XCUIElementTypeButton[@name="Enter address manually"]');
        await manualAddress.waitForDisplayed({ timeout: timeoutMs.uiControl });
        await manualAddress.click();
        await $('//XCUIElementTypeTextField[@name="Address line 1"]').waitForDisplayed({
          timeout: timeoutMs.uiControl,
        });
      } else {
        await browser.execute('mobile: swipe', { direction: 'up' });
        const guest = await $('//XCUIElementTypeButton[@name="Continue as guest"]');
        await guest.waitForDisplayed({ timeout: timeoutMs.uiControl });
        await guest.click();
        await capture('guest-next');
      }
    } else if (process.env.SHOWPASS_CUSTOMER_EMAIL && process.env.SHOWPASS_CUSTOMER_PASSWORD) {
      await $('//XCUIElementTypeTextField[@name="Email address"]').setValue(
        process.env.SHOWPASS_CUSTOMER_EMAIL,
      );
      await $('//XCUIElementTypeSecureTextField[@name="Password"]').setValue(
        process.env.SHOWPASS_CUSTOMER_PASSWORD,
      );
      await $('//XCUIElementTypeButton[@name="Log in"]').click();
      await browser.waitUntil(
        async () => (await browser.getPageSource()).includes(checkoutStepText.guestDetailsComplete),
        {
          timeout: timeoutMs.customerLogin,
          timeoutMsg: 'Checkout did not advance after the Customer logged in',
        },
      );
    }
  });
});
