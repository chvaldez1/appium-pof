import { browser } from '@wdio/globals';
import { baseURL } from '@config/test-settings.ts';
import { switchToWebview } from '@support/contexts/switch-to-webview.ts';
import { buyerAccountWebviewPage } from '@screens/webviews/buyer/account.ts';

export async function waitForAccountWebview(path: string): Promise<void> {
  try {
    await switchToWebview(browser, {
      matchesUrl: (url) => url.origin === new URL(baseURL).origin && url.pathname === path,
      isReady: () => buyerAccountWebviewPage.isRenderedAtPath(path),
      description: 'the expected account page',
    });
  } finally {
    await browser.switchContext('NATIVE_APP');
  }
}
