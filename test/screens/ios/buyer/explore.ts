import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { $, $$, browser } from '@wdio/globals';
import { appId, pauseMs, timeoutMs } from '../../../settings.ts';
import { expectedCardTotalText, type PurchaseScenario } from '../../../shared/purchase/scenario.ts';
import { contextId } from '../../../shared/helpers/context-id.ts';
import { clickBuyTicketsOnEventPage } from '../../../shared/webview/buyer/event.ts';
import { currentPurchaseRunDirectory } from '../../../shared/purchase/run-artifacts.ts';
import type { Capture } from './types.ts';

const emptyQuantity = '0';

function xpathLiteral(value: string): string {
  if (!value.includes("'")) return `'${value}'`;
  if (!value.includes('"')) return `"${value}"`;
  return `concat(${value
    .split("'")
    .map((part) => `'${part}'`)
    .join(`, "'", `)})`;
}

// Native Explore -> event WebView -> native ticket picker.
export async function openEventCheckout({
  scenario,
  capture = async () => {},
  onEventWebview = async () => {},
}: {
  scenario: PurchaseScenario;
  capture?: Capture;
  onEventWebview?: (context: string) => Promise<void>;
}): Promise<string> {
  await browser.activateApp(appId);
  const alert = await browser.getAlertText().catch(() => '');
  if (/location/i.test(alert)) await browser.dismissAlert();

  const search = await $('~Search location or event');
  await search.waitForDisplayed({ timeout: timeoutMs.uiNavigation });
  await search.click();
  await capture('search-open');
  await $('//XCUIElementTypeTextField[@placeholderValue="Search location or event"]').setValue(
    scenario.eventName,
  );
  await browser.pause(pauseMs.searchSuggestions);
  await capture('search-results');
  const submit = await $('//XCUIElementTypeButton[@name="Search"]');
  await submit.waitForDisplayed({ timeout: timeoutMs.uiNavigation });
  await submit.click();
  await browser.pause(pauseMs.searchResults);
  await capture('search-result-screen');

  const card = await $(
    `//XCUIElementTypeOther[contains(@name,"banner") and contains(@name,${xpathLiteral(scenario.eventName)}) and @accessible="true"]`,
  );
  await card.waitForDisplayed({ timeout: timeoutMs.uiNavigation });
  await card.click();
  await $('~BUY TICKETS').waitForDisplayed({ timeout: timeoutMs.pageLoad });
  await capture('event-open');
  assert.ok((await browser.getPageSource()).includes(scenario.eventName));
  const webview = (await browser.getContexts()).map(contextId).find((id) => id?.startsWith('WEBVIEW_'));
  assert.ok(webview, `${scenario.eventName} must expose an inspectable WebView`);
  await browser.switchContext(webview);
  assert.ok((await browser.getUrl()).startsWith(scenario.eventUrl));
  await onEventWebview(webview);
  await clickBuyTicketsOnEventPage();
  await browser.switchContext('NATIVE_APP');
  const increment = await $('~Increment item quantity');
  try {
    await increment.waitForDisplayed({ timeout: timeoutMs.uiControl });
  } catch {
    // The first tap can land while the event page is still hydrating.
    await browser.switchContext(webview);
    await clickBuyTicketsOnEventPage();
    await browser.switchContext('NATIVE_APP');
    try {
      await increment.waitForDisplayed({ timeout: timeoutMs.uiNavigation });
    } catch (error) {
      try {
        const diagnostics = currentPurchaseRunDirectory();
        mkdirSync(diagnostics, { recursive: true });
        await browser.saveScreenshot(resolve(diagnostics, 'ticket-picker-missing.png'));
        writeFileSync(resolve(diagnostics, 'ticket-picker-missing.xml'), await browser.getPageSource());
      } catch {
        /* Preserve the original ticket-picker failure. */
      }
      throw error;
    }
  }
  await capture('ticket-picker');
  const ticketHeader = `//XCUIElementTypeOther[@name=${xpathLiteral(scenario.ticketName)} and XCUIElementTypeStaticText[@name=${xpathLiteral(scenario.ticketName)}]]`;
  const ticketControls = `${ticketHeader}/following-sibling::XCUIElementTypeOther[.//XCUIElementTypeButton[@name="Increment item quantity"]][1]`;
  const chosenQuantity = await $(`${ticketControls}//XCUIElementTypeTextField[@name="Enter a quantity"]`);
  const chosenIncrement = await $(
    `${ticketControls}//XCUIElementTypeButton[@name="Increment item quantity"]`,
  );
  await chosenIncrement.waitForDisplayed({ timeout: timeoutMs.uiControl });
  const quantities = await $$('~Enter a quantity');
  assert.ok((await quantities.length) > 0, 'No ticket quantity controls were shown.');
  for (const quantity of quantities) {
    assert.equal(await quantity.getValue(), emptyQuantity, 'Start with an empty basket; set RESET_APP=1.');
  }
  for (let count = 0; count < scenario.quantity; count += 1) await chosenIncrement.click();
  assert.equal(await chosenQuantity.getValue(), String(scenario.quantity));
  let selectedTotal = 0;
  for (const quantity of await $$('~Enter a quantity')) {
    selectedTotal += Number(await quantity.getValue());
  }
  assert.equal(selectedTotal, scenario.quantity, 'Only the chosen ticket type should be selected.');
  await capture('ticket-selected');
  const checkout = await $('//XCUIElementTypeButton[starts-with(@name,"Checkout")]');
  await checkout.waitForEnabled({ timeout: timeoutMs.uiNavigation });
  await checkout.click();
  await browser.pause(pauseMs.checkoutTransition);
  await capture('checkout-open');
  assert.ok(
    (await browser.getPageSource()).includes(expectedCardTotalText(scenario)),
    `${scenario.ticketName} card total must be ${expectedCardTotalText(scenario)}.`,
  );
  return webview;
}
