import { browser } from '@wdio/globals';
import { baseURL } from '@config/test-settings.ts';
import { assertBetaPage } from '@support/assertions/beta-page.ts';

describe('Safari setup', () => {
  it('loads Showpass beta', async () => {
    await browser.url(baseURL);
    await assertBetaPage();
  });
});
