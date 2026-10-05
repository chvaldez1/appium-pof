import assert from 'node:assert/strict';
import { browser } from '@wdio/globals';
import { iosExplorePage } from '@screens/ios/buyer/explore.ts';
import { iosEventDetailsPage } from '@screens/ios/buyer/event-details.ts';
import { eventWebviewPage } from '@screens/webview/buyer/event.ts';
import { contextId } from '@shared/helpers/context-id.ts';
import type { PurchaseScenario } from '@shared/purchase/scenario.ts';
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
  const webview = (await browser.getContexts()).map(contextId).find((id) => id?.startsWith('WEBVIEW_'));
  assert.ok(webview, `${scenario.eventName} must expose an inspectable WebView`);
  await browser.switchContext(webview);
  await eventWebviewPage.waitForEvent(scenario.eventUrl);
  return webview;
}
