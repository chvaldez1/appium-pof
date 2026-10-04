import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { browser } from '@wdio/globals';
import { iosExplorePage } from '@screens/ios/buyer/explore.ts';
import { iosEventDetailsPage } from '@screens/ios/buyer/event-details.ts';
import { iosTicketPickerPage } from '@screens/ios/buyer/ticket-picker.ts';
import { iosGuestCheckoutPage } from '@screens/ios/buyer/checkout.ts';
import { contextId } from '@shared/helpers/context-id.ts';
import type { PurchaseScenario } from '@shared/purchase/scenario.ts';
import { currentPurchaseRunDirectory } from '@shared/purchase/run-artifacts.ts';
import { eventWebviewPage } from '@screens/webview/buyer/event.ts';
import { appId, timeoutMs } from '@config/test-settings.ts';

type Capture = (name: string) => Promise<void>;

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
  await iosExplorePage.openSearch();
  await capture('search-open');
  await iosExplorePage.enterEventName(scenario.eventName);
  await capture('search-results');
  await iosExplorePage.submitSearch();
  await capture('search-result-screen');
  await iosExplorePage.openEventResult(scenario.eventName);
  await iosEventDetailsPage.waitForEvent(scenario.eventName);
  await capture('event-open');
  const webview = (await browser.getContexts()).map(contextId).find((id) => id?.startsWith('WEBVIEW_'));
  assert.ok(webview, `${scenario.eventName} must expose an inspectable WebView`);
  await browser.switchContext(webview);
  await eventWebviewPage.waitForEvent(scenario.eventUrl);
  await onEventWebview(webview);
  await eventWebviewPage.openTicketPicker();
  await browser.switchContext('NATIVE_APP');
  try {
    await iosTicketPickerPage.waitForOpen();
  } catch {
    // The first tap can land while the Event WebView is still hydrating.
    await browser.switchContext(webview);
    await eventWebviewPage.openTicketPicker();
    await browser.switchContext('NATIVE_APP');
    try {
      await iosTicketPickerPage.waitForOpen(timeoutMs.uiNavigation);
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
  await iosTicketPickerPage.selectTicket(scenario.ticketName, scenario.quantity);
  await capture('ticket-selected');
  await iosTicketPickerPage.openCheckout();
  await capture('checkout-open');
  await iosGuestCheckoutPage.waitForTotal(scenario);
  return webview;
}
