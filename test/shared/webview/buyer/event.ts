import { $ } from '@wdio/globals';
import { timeoutMs } from '../../../settings.ts';

// Call from the Event WebView before switching back to native ticket controls.
export async function clickBuyTicketsOnEventPage(): Promise<void> {
  const buy = await $(
    '//button[contains(translate(normalize-space(.),"abcdefghijklmnopqrstuvwxyz","ABCDEFGHIJKLMNOPQRSTUVWXYZ"),"BUY TICKETS")]',
  );
  await buy.waitForDisplayed({ timeout: timeoutMs.uiNavigation });
  await buy.click();
}
