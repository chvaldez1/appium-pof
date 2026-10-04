import assert from 'node:assert/strict';
import { $, browser } from '@wdio/globals';
import { pauseMs, timeoutMs } from '../../../settings.ts';
import { expectedCardTotalText, type PurchaseScenario } from '../../../shared/purchase/scenario.ts';

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
    await this.fullName.setValue(guest.name);
    await this.email.setValue(guest.email);
    await this.phone.setValue(guest.phone);
    await this.continueButton.click();
    await this.confirmButton.waitForDisplayed({ timeout: timeoutMs.uiControl });
    await this.confirmButton.click();
    await browser.waitUntil(
      async () => (await browser.getPageSource()).includes(checkoutStepText.guestDetailsComplete),
      { timeout: timeoutMs.uiNavigation, timeoutMsg: 'Guest details did not advance to step 2' },
    );
    await this.continueButton.click();
    await browser.waitUntil(
      async () => (await browser.getPageSource()).includes(checkoutStepText.addOnsComplete),
      { timeout: timeoutMs.uiNavigation, timeoutMsg: 'Checkout did not advance past optional add-ons' },
    );
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
      throw new Error('Guest checkout did not advance to payment; no payment was submitted.', {
        cause: error,
      });
    }
    await this.terms.waitForDisplayed({ timeout: timeoutMs.uiControl });
    await this.terms.click();
    await browser.execute('mobile: swipe', { direction: 'up' });
    await this.creditCardMethod.click();
    await browser.pause(pauseMs.cardMethod);
    await browser.execute('mobile: swipe', { direction: 'up' });
  }

  async fillCard(card: PurchaseScenario['testCard']): Promise<void> {
    await this.cardholderName.setValue(card.nameOnCard);
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
    await this.email.setValue(email);
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
