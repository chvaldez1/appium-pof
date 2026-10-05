import assert from 'node:assert/strict';
import { browser } from '@wdio/globals';
import { baseURL, target, pollIntervalMs, timeoutMs } from '@config/test-settings.ts';
import { openEventDetails } from '@flows/ios/buyer/open-event-details.ts';
import { adultTicketPurchase } from '@shared/purchase/scenario.ts';
import { assertBetaPage } from '@shared/helpers/beta-page.ts';
import { contextId } from '@shared/helpers/context-id.ts';

describe('Embedded WebView setup', () => {
  it('finds beta in a WebView and returns to native controls', async () => {
    assert.equal(await browser.getContext(), 'NATIVE_APP');
    if (target === 'ios-app') {
      await openEventDetails({ scenario: adultTicketPurchase });
      await browser.switchContext('NATIVE_APP');
    }
    let lastContexts: unknown[] = [];
    let lastError = '';
    try {
      await browser.waitUntil(
        async () => {
          await browser.switchContext('NATIVE_APP');
          lastContexts = await browser.getContexts();
          const ids = lastContexts.map(contextId);
          for (const id of ids.filter(
            (id): id is string => typeof id === 'string' && id.startsWith('WEBVIEW'),
          )) {
            try {
              await browser.switchContext(id);
              for (const handle of await browser.getWindowHandles()) {
                await browser.switchToWindow(handle);
                if (new URL(await browser.getUrl()).origin === new URL(baseURL).origin) {
                  return true;
                }
              }
            } catch (error) {
              lastError = String(error);
            }
            await browser.switchContext('NATIVE_APP');
          }
          return false;
        },
        {
          timeout: timeoutMs.webviewDiscovery,
          interval: pollIntervalMs.webview,
          timeoutMsg: 'No inspectable beta WebView found.',
        },
      );
      await assertBetaPage();
    } catch (error) {
      console.error({ lastContexts, lastError });
      throw error;
    } finally {
      await browser.switchContext('NATIVE_APP');
    }
    assert.equal(await browser.getContext(), 'NATIVE_APP');
  });
});
