import { browser } from '@wdio/globals';
import { baseURL } from '../settings.ts';
import { assertBetaPage } from '../shared/helpers/beta-page.ts';

describe('Safari setup', () => {
  it('loads Showpass beta', async () => {
    await browser.url(baseURL);
    await assertBetaPage();
  });
});
