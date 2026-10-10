import assert from 'node:assert/strict';
import { $, browser } from '@wdio/globals';
import { pauseMs, timeoutMs } from '@config/test-settings.ts';
import { expectedCardTotalText, type PurchaseScenario } from '@data/purchase-scenario.ts';
import { enterIosText } from '@support/input/ios-text-input.ts';

export const checkoutStepText = {
  guestDetailsComplete: '2 of 4',
  addOnsComplete: '3 of 4',
  payment: '4 of 4',
} as const;

class IosGuestCheckoutPage {
  async waitForTotal(scenario: PurchaseScenario): Promise<void> {
    assert.ok(
      (await browser.getPageSource()).includes(expectedCardTotalText(scenario)),
      `${scenario.ticketName} card total must be ${expectedCardTotalText(scenario)}.`,
    );
  }

  get continueAsGuest() {
    return $('//XCUIElementTypeButton[@name="Continue as guest"]');
  }

  get fullName() {
    return $('//XCUIElementTypeTextField[@name="Full name"]');
  }

  get email() {
    return $('//XCUIElementTypeTextField[@name="Email address"]');
  }

  get phone() {
    return $('//XCUIElementTypeTextField[@placeholderValue="Phone number"]');
  }

  get continueButton() {
    return $('//XCUIElementTypeButton[@name="Continue"]');
  }

  get confirmButton() {
    return $('//XCUIElementTypeButton[@name="Confirm"]');
  }

  get terms() {
    return $(
      '//XCUIElementTypeStaticText[@name="I accept the"]/parent::XCUIElementTypeOther/preceding-sibling::XCUIElementTypeOther[1]//XCUIElementTypeSwitch',
    );
  }

  get creditCardMethod() {
    return $('//XCUIElementTypeButton[@name="Credit card"]');
  }

  get cardholderName() {
    return $('//XCUIElementTypeTextField[@placeholderValue="Name on card"]');
  }

  get cardNumber() {
    return $('//XCUIElementTypeTextField[@name="Credit or debit card number"]');
  }

  get cardExpiry() {
    return $('//XCUIElementTypeTextField[@name="Credit or debit card expiration date"]');
  }

  get cardCvc() {
    return $('//XCUIElementTypeTextField[@name="Credit or debit card CVC/CVV"]');
  }

  get manualAddress() {
    return $('//XCUIElementTypeButton[@name="Enter address manually"]');
  }

  get addressLineOne() {
    return $('//XCUIElementTypeTextField[@name="Address line 1"]');
  }

  get password() {
    return $('//XCUIElementTypeSecureTextField[@name="Password"]');
  }

  get logIn() {
    return $('//XCUIElementTypeButton[@name="Log in"]');
  }

  async startGuest(): Promise<void> {
    await browser.execute('mobile: swipe', { direction: 'up' });
    await this.continueAsGuest.waitForDisplayed({ timeout: timeoutMs.uiControl });
    await this.continueAsGuest.click();
  }

  async advanceGuestToCreditCard(guest: { name: string; email: string; phone: string }): Promise<void> {
    assert.ok(guest.name && guest.email && guest.phone, 'Guest name, email, and phone are required.');
    await this.startGuest();
    await browser.pause(pauseMs.guestForm);
    await enterIosText(await this.fullName, guest.name);
    await enterIosText(await this.email, guest.email);
    // The phone control applies a country mask; native clearValue is not reliable here.
    await this.phone.setValue(guest.phone);
    await this.continueButton.waitForEnabled({ timeout: timeoutMs.uiControl });
    await this.continueButton.click();
    await this.confirmButton.waitForDisplayed({ timeout: timeoutMs.uiControl });
    await this.confirmButton.click();
    await browser.waitUntil(
      async () => (await browser.getPageSource()).includes(checkoutStepText.guestDetailsComplete),
      { timeout: timeoutMs.uiNavigation, timeoutMsg: 'Guest details did not advance to step 2' },
    );
    console.log('Public checkout: guest details accepted.');
    await this.continueButton.waitForEnabled({ timeout: timeoutMs.uiControl });
    await this.continueButton.click();
    await browser.waitUntil(
      async () => (await browser.getPageSource()).includes(checkoutStepText.addOnsComplete),
      { timeout: timeoutMs.uiNavigation, timeoutMsg: 'Checkout did not advance past optional add-ons' },
    );
    console.log('Public checkout: optional add-ons rendered.');
    await this.continueButton.waitForEnabled({ timeout: timeoutMs.uiControl });
    await this.continueButton.click();
    try {
      await browser.waitUntil(
        async () => (await browser.getPageSource()).includes(checkoutStepText.payment),
        {
          timeout: timeoutMs.uiNavigation,
          timeoutMsg: 'Checkout did not advance to payment',
        },
      );
    } catch (error) {
      const source = await browser.getPageSource();
      const lastStep = Object.values(checkoutStepText)
        .filter((text) => source.includes(text))
        .join(', ');
      throw new Error(
        `Guest checkout did not advance to payment (visible step: ${lastStep || 'unknown'}); no payment was submitted.`,
        {
          cause: error,
        },
      );
    }
    console.log('Public checkout: payment step rendered.');
    await this.terms.waitForDisplayed({ timeout: timeoutMs.uiControl });
    await this.terms.click();
    await browser.execute('mobile: swipe', { direction: 'up' });
    await this.creditCardMethod.click();
    await browser.pause(pauseMs.cardMethod);
    await browser.execute('mobile: swipe', { direction: 'up' });
  }

  async fillCard(card: PurchaseScenario['testCard']): Promise<void> {
    await enterIosText(await this.cardholderName, card.nameOnCard);
    await this.cardNumber.setValue(card.number);
    await this.cardExpiry.setValue(card.expiry);
    await this.cardCvc.setValue(card.cvc);
  }

  async openManualAddress(): Promise<void> {
    await this.manualAddress.waitForDisplayed({ timeout: timeoutMs.uiControl });
    await this.manualAddress.click();
    await this.addressLineOne.waitForDisplayed({ timeout: timeoutMs.uiControl });
  }

  async signInCustomer(email: string, password: string): Promise<void> {
    await enterIosText(await this.email, email);
    await this.password.setValue(password);
    await this.logIn.click();
    await browser.waitUntil(
      async () => (await browser.getPageSource()).includes(checkoutStepText.guestDetailsComplete),
      {
        timeout: timeoutMs.customerLogin,
        timeoutMsg: 'Checkout did not advance after the Customer logged in',
      },
    );
  }
}

export const iosGuestCheckoutPage = new IosGuestCheckoutPage();
