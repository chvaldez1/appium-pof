import { browser } from '@wdio/globals';
import { timeoutMs } from '../../../settings.ts';
import { contextId } from '../../../shared/helpers/context-id.ts';
import { buyerAccountWebviewPage } from '../../../shared/webview/buyer/account.ts';

export async function waitForAccountWebview(path: string): Promise<void> {
  await browser.waitUntil(
    async () => {
      const contexts = (await browser.getContexts())
        .map(contextId)
        .filter((id) => id?.startsWith('WEBVIEW_'));
      for (const context of contexts) {
        if (!context) continue;
        try {
          await browser.switchContext(context);
          if (await buyerAccountWebviewPage.isRenderedAtPath(path)) return true;
        } catch {
          // A WebView can disappear while changing tabs. Try the next live context.
        } finally {
          await browser.switchContext('NATIVE_APP');
        }
      }
      return false;
    },
    { timeout: timeoutMs.webviewDiscovery, timeoutMsg: `The ${path} WebView did not render.` },
  );
}
