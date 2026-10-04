import { browser } from '@wdio/globals';

class BuyerAccountWebviewPage {
  async isRenderedAtPath(path: string): Promise<boolean> {
    const url = new URL(await browser.getUrl());
    if (url.hostname !== 'beta.showpass.com' || !url.pathname.endsWith(path)) return false;
    return browser.execute(
      () => document.readyState === 'complete' && Boolean(document.body?.innerText.trim()),
    );
  }
}

export const buyerAccountWebviewPage = new BuyerAccountWebviewPage();
