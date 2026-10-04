import assert from 'node:assert/strict';
import { browser } from '@wdio/globals';
import { baseURL, timeoutMs } from '../../settings.ts';

export async function assertBetaPage() {
  await browser.waitUntil(
    async () => {
      try {
        return new URL(await browser.getUrl()).origin === new URL(baseURL).origin;
      } catch {
        return false;
      }
    },
    { timeout: timeoutMs.pageLoad, timeoutMsg: 'Expected the Showpass beta origin.' },
  );
  await browser.waitUntil(
    async () => {
      return browser.execute(
        () => document.readyState === 'complete' && Boolean(document.body?.innerText.trim()),
      );
    },
    { timeout: timeoutMs.pageLoad, timeoutMsg: 'The page did not finish loading visible text.' },
  );
  assert.match(await browser.getTitle(), /showpass/i, 'Expected a Showpass page title.');
}
