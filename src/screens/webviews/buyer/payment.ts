import assert from 'node:assert/strict';
import { $, $$, browser } from '@wdio/globals';
import { timeoutMs } from '@config/test-settings.ts';
import { expectedCardTotalText, type PurchaseScenario } from '@data/purchase-scenario.ts';

class PaymentWebviewPage {
  get manualAddress() {
    return $('//button[contains(normalize-space(.),"Enter address manually")]');
  }

  get completeTransactionButtons() {
    return $$('button[data-testid="checkout-summary-complete-transaction"]');
  }

  get orderStatus() {
    return $('[data-testid="order-status"]');
  }

  get transactionId() {
    return $('[data-testid="order-status-transaction-id"]');
  }

  addressField(id: string) {
    return $(`#checkout_billing_address_form_info_home_address_${id}`);
  }

  async prepare(scenario: PurchaseScenario) {
    await this.manualAddress.scrollIntoView();
    await this.manualAddress.click();
    const address = scenario.billingAddress;
    for (const [id, value] of [
      ['street_name', address.street],
      ['unit_number', address.unit],
      ['city', address.city],
    ] as const) {
      await this.addressField(id).waitForDisplayed({ timeout: timeoutMs.uiControl });
      await this.addressField(id).scrollIntoView();
      await this.addressField(id).addValue(value);
    }
    await this.addressField('country').selectByVisibleText(address.country);
    await this.addressField('province').selectByVisibleText(address.province);
    await this.addressField('postal').scrollIntoView();
    await this.addressField('postal').addValue(address.postal);

    const submitSelector = 'button[data-testid="checkout-summary-complete-transaction"]';
    const submitIndex = await browser.execute(
      (selector: string) =>
        [...document.querySelectorAll<HTMLButtonElement>(selector)].findIndex((button) => {
          const style = getComputedStyle(button);
          const rect = button.getBoundingClientRect();
          return (
            style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
          );
        }),
      submitSelector,
    );
    assert.ok(submitIndex >= 0, 'The mobile Complete transaction button is missing.');
    const submit = (await this.completeTransactionButtons)[submitIndex];
    await submit.scrollIntoView();
    assert.ok(
      (await $('body').getText()).includes(`${expectedCardTotalText(scenario)} CAD`),
      'Review the final total before payment.',
    );
    assert.ok(await submit.isDisplayed(), 'Complete transaction must be available after card entry.');

    return {
      submitOnce: async (): Promise<{ transactionId?: string; checkoutError?: unknown }> => {
        try {
          // An uncertain outcome is resolved through the invoice API, never a second click.
          await submit.click();
          await this.orderStatus.waitForDisplayed({ timeout: timeoutMs.orderFinalization });
          assert.match(await this.orderStatus.getText(), /Order confirmed/i);
          return { transactionId: (await this.transactionId.getText()).trim() };
        } catch (checkoutError) {
          return { checkoutError };
        }
      },
    };
  }
}

export const paymentWebviewPage = new PaymentWebviewPage();
