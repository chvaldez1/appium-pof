import assert from 'node:assert/strict';
import { $, $$, browser } from '@wdio/globals';
import { timeoutMs } from '../../../settings.ts';
import { expectedCardTotalText, type PurchaseScenario } from '../../purchase/scenario.ts';

// Call only after switching into the checkout WebView. These are DOM controls,
// independent of the iOS or Android native controls surrounding the WebView.
export async function prepareWebviewPayment(scenario: PurchaseScenario) {
  const manualAddress = await $('//button[contains(normalize-space(.),"Enter address manually")]');
  await manualAddress.scrollIntoView();
  await manualAddress.click();
  const address = scenario.billingAddress;
  for (const [selector, value] of [
    ['#checkout_billing_address_form_info_home_address_street_name', address.street],
    ['#checkout_billing_address_form_info_home_address_unit_number', address.unit],
    ['#checkout_billing_address_form_info_home_address_city', address.city],
  ] as const) {
    const field = await $(selector);
    await field.waitForDisplayed({ timeout: timeoutMs.uiControl });
    await field.scrollIntoView();
    await field.addValue(value);
  }
  await $('#checkout_billing_address_form_info_home_address_country').selectByVisibleText(address.country);
  await $('#checkout_billing_address_form_info_home_address_province').selectByVisibleText(address.province);
  const postal = await $('#checkout_billing_address_form_info_home_address_postal');
  await postal.scrollIntoView();
  await postal.addValue(address.postal);

  const submitSelector = 'button[data-testid="checkout-summary-complete-transaction"]';
  const submitIndex = await browser.execute(
    (selector: string) =>
      [...document.querySelectorAll<HTMLButtonElement>(selector)].findIndex((button) => {
        const style = getComputedStyle(button);
        const rect = button.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      }),
    submitSelector,
  );
  assert.ok(submitIndex >= 0, 'The mobile Complete transaction button is missing.');
  const submit = (await $$(submitSelector))[submitIndex];
  await submit.scrollIntoView();
  assert.ok(
    (await $('body').getText()).includes(`${expectedCardTotalText(scenario)} CAD`),
    'Review the final total before payment.',
  );
  assert.ok(await submit.isDisplayed(), 'Complete transaction must be available after card entry.');

  return {
    async submitOnce(): Promise<{ transactionId?: string; checkoutError?: unknown }> {
      try {
        // Resolve an uncertain outcome through the invoice API; never retry this click.
        await submit.click();
        const status = await $('[data-testid="order-status"]');
        await status.waitForDisplayed({ timeout: timeoutMs.orderFinalization });
        assert.match(await status.getText(), /Order confirmed/i);
        const transactionId = (await $('[data-testid="order-status-transaction-id"]').getText()).trim();
        return { transactionId };
      } catch (checkoutError) {
        return { checkoutError };
      }
    },
  };
}
