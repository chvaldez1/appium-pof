import assert from 'node:assert/strict';
import { $, browser } from '@wdio/globals';
import { pauseMs, timeoutMs } from '../../../settings.ts';
import type { Capture } from './types.ts';

export const checkoutStepText = {
  guestDetailsComplete: '2 of 4',
  addOnsComplete: '3 of 4',
  payment: '4 of 4',
} as const;

// Guest details -> payment method in the embedded checkout.
export async function continueGuestToCreditCard({
  webview,
  guestName,
  guestEmail,
  guestPhone,
  capture = async () => {},
}: {
  webview: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  capture?: Capture;
}): Promise<string> {
  assert.ok(guestName && guestEmail && guestPhone, 'Guest name, email, and phone are required.');
  await browser.execute('mobile: swipe', { direction: 'up' });
  const guest = await $('//XCUIElementTypeButton[@name="Continue as guest"]');
  await guest.waitForDisplayed({ timeout: timeoutMs.uiControl });
  await guest.click();
  await browser.pause(pauseMs.guestForm);
  await capture('guest-next');
  await $('//XCUIElementTypeTextField[@name="Full name"]').setValue(guestName);
  await $('//XCUIElementTypeTextField[@name="Email address"]').setValue(guestEmail);
  await $('//XCUIElementTypeTextField[@placeholderValue="Phone number"]').setValue(guestPhone);
  await $('//XCUIElementTypeButton[@name="Continue"]').click();
  const confirm = await $('//XCUIElementTypeButton[@name="Confirm"]');
  await confirm.waitForDisplayed({ timeout: timeoutMs.uiControl });
  await confirm.click();
  await browser.waitUntil(
    async () => (await browser.getPageSource()).includes(checkoutStepText.guestDetailsComplete),
    {
      timeout: timeoutMs.uiNavigation,
      timeoutMsg: 'Guest details did not advance to step 2',
    },
  );
  await capture('guest-step-two');
  await $('//XCUIElementTypeButton[@name="Continue"]').click();
  await browser.waitUntil(
    async () => (await browser.getPageSource()).includes(checkoutStepText.addOnsComplete),
    {
      timeout: timeoutMs.uiNavigation,
      timeoutMsg: 'Checkout did not advance past optional add-ons',
    },
  );
  await capture('guest-step-three');
  await $('//XCUIElementTypeButton[@name="Continue"]').click();
  try {
    await browser.waitUntil(async () => (await browser.getPageSource()).includes(checkoutStepText.payment), {
      timeout: timeoutMs.uiNavigation,
      timeoutMsg: 'Checkout did not advance to payment',
    });
  } catch (error) {
    // This view contains the guest's name, email, and phone. Keep it out of artifacts.
    throw new Error('Guest checkout did not advance to payment; no payment was submitted.', { cause: error });
  }
  await capture('guest-payment-empty');
  const terms = await $(
    '//XCUIElementTypeStaticText[@name="I accept the"]/parent::XCUIElementTypeOther/preceding-sibling::XCUIElementTypeOther[1]//XCUIElementTypeSwitch',
  );
  await terms.waitForDisplayed({ timeout: timeoutMs.uiControl });
  await terms.click();
  await capture('guest-payment-terms');
  await browser.execute('mobile: swipe', { direction: 'up' });
  await capture('guest-payment-controls');
  await $('//XCUIElementTypeButton[@name="Credit card"]').click();
  await browser.pause(pauseMs.cardMethod);
  await browser.execute('mobile: swipe', { direction: 'up' });
  await capture('guest-credit-card-empty');
  return String(webview);
}
