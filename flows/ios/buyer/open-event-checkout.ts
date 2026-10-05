import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { browser } from '@wdio/globals';
import { iosTicketPickerPage } from '@screens/ios/buyer/ticket-picker.ts';
import { iosGuestCheckoutPage } from '@screens/ios/buyer/checkout.ts';
import { openEventDetails } from '@flows/ios/buyer/open-event-details.ts';
import type { PurchaseScenario } from '@shared/purchase/scenario.ts';
import { currentPurchaseRunDirectory } from '@shared/purchase/run-artifacts.ts';
import { eventWebviewPage } from '@screens/webview/buyer/event.ts';
import { timeoutMs } from '@config/test-settings.ts';

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
  const webview = await openEventDetails({ scenario, capture });
  await onEventWebview(webview);
  console.log('Public checkout: opening the ticket picker.');
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
  console.log('Public checkout: waiting for guest checkout.');
  await capture('checkout-open');
  await iosGuestCheckoutPage.waitForTotal(scenario);
  return webview;
}
