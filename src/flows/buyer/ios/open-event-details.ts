import { browser } from '@wdio/globals';
import { iosExplorePage } from '@screens/native/ios/buyer/explore.ts';
import { iosEventDetailsPage } from '@screens/native/ios/buyer/event-details.ts';
import { eventWebviewPage } from '@screens/webviews/buyer/event.ts';
import { switchToWebview } from '@support/contexts/switch-to-webview.ts';
import type { PurchaseScenario } from '@data/purchase-scenario.ts';
import { appId } from '@config/test-settings.ts';

export async function openEventDetails({
  scenario,
  capture = async () => {},
}: {
  scenario: Pick<PurchaseScenario, 'eventName' | 'eventUrl'>;
  capture?: (name: string) => Promise<void>;
}): Promise<string> {
  await browser.activateApp(appId);
  await browser.switchContext('NATIVE_APP');
  console.log('Public event: searching for the event.');
  await iosExplorePage.openSearch();
  await capture('search-open');
  await iosExplorePage.enterEventName(scenario.eventName);
  await capture('search-results');
  await iosExplorePage.submitSearch();
  await capture('search-result-screen');
  await iosExplorePage.openEventResult(scenario.eventName);
  console.log('Public event: waiting for event details to render.');
  await iosEventDetailsPage.waitForEvent(scenario.eventName);
  await capture('event-open');
  const expected = new URL(scenario.eventUrl);
  const webview = await switchToWebview(browser, {
    matchesUrl: (url) => url.origin === expected.origin && url.pathname === expected.pathname,
    description: 'the expected event page',
  });
  await eventWebviewPage.waitForEvent(scenario.eventUrl);
  return webview;
}
