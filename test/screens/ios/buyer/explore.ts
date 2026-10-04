import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { $, $$, browser } from '@wdio/globals';
import { appId, pauseMs, timeoutMs } from '../../../settings.ts';
import { expectedCardTotalText, type PurchaseScenario } from '../../../shared/purchase/scenario.ts';
import { contextId } from '../../../shared/helpers/context-id.ts';
import { clickBuyTicketsOnEventPage } from '../../../shared/webview/buyer/event.ts';
import type { Capture } from './types.ts';

const ticketPicker = { adultIndex: 0, youthIndex: 1, optionCount: 2, emptyQuantity: '0' } as const;

// Native Explore -> event WebView -> native Adult ticket picker.
export async function openComicConCheckout({
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
    '//XCUIElementTypeOther[contains(@name,"banner") and contains(@name,"Comic Con") and @accessible="true"]',
  );
  await card.waitForDisplayed({ timeout: timeoutMs.uiNavigation });
  await card.click();
  await $('~BUY TICKETS').waitForDisplayed({ timeout: timeoutMs.pageLoad });
  await capture('event-open');
  assert.ok((await browser.getPageSource()).includes(scenario.eventName));
  const webview = (await browser.getContexts()).map(contextId).find((id) => id?.startsWith('WEBVIEW_'));
  assert.ok(webview, 'Comic Con must expose an inspectable WebView');
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
        const diagnostics = resolve('artifacts', 'ios-app', 'purchase');
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
  const incrementButtons = await $$('~Increment item quantity');
  const { adultIndex, youthIndex, optionCount, emptyQuantity } = ticketPicker;
  assert.equal(incrementButtons.length, optionCount, 'Expected Adult and Youth quantity controls.');
  const quantities = await $$('~Enter a quantity');
  assert.equal(
    await quantities[adultIndex].getValue(),
    emptyQuantity,
    'Start with an empty basket; set RESET_APP=1.',
  );
  await incrementButtons[adultIndex].click();
  assert.equal(await quantities[adultIndex].getValue(), String(scenario.quantity));
  assert.equal(await quantities[youthIndex].getValue(), emptyQuantity);
  await capture('adult-selected');
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
