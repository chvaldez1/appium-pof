import assert from 'node:assert/strict';
import { test } from 'node:test';
import { switchToWebview, type WebviewDriver } from '@support/contexts/switch-to-webview.ts';

function contextDriver(pages: Record<string, Record<string, string>>, polls = 2) {
  let context = 'NATIVE_APP';
  let window = '';
  let discoveries = 0;
  const driver: WebviewDriver = {
    getContexts: async () => {
      discoveries += 1;
      // Simulate a WebView appearing after the native screen has rendered.
      return discoveries === 1 ? ['NATIVE_APP'] : ['NATIVE_APP', ...Object.keys(pages).map((id) => ({ id }))];
    },
    switchContext: async (id) => {
      context = id;
    },
    getWindowHandles: async () => {
      if (context === 'WEBVIEW_detached') throw new Error('Context detached');
      return Object.keys(pages[context]);
    },
    switchToWindow: async (handle) => {
      window = handle;
    },
    getUrl: async () => {
      const url = pages[context][window];
      if (url === 'detached') throw new Error('Window detached');
      return url;
    },
    waitUntil: async (condition, options) => {
      for (let poll = 0; poll < polls; poll += 1) if (await condition()) return;
      throw new Error(options.timeoutMsg);
    },
  };
  return { driver, current: () => ({ context, window }) };
}

void test('WebView selection waits for discovery and matches the origin/path across windows', async () => {
  const { driver, current } = contextDriver({
    WEBVIEW_ads: { ad: 'https://ads.example.test/comic-con/' },
    WEBVIEW_event: {
      blank: 'about:blank',
      stale: 'detached',
      similar: 'https://beta.showpass.com/comic-con-other/',
      event: 'https://beta.showpass.com/comic-con/?embedded=1',
    },
  });
  const selected = await switchToWebview(driver, {
    matchesUrl: (url) => url.origin === 'https://beta.showpass.com' && url.pathname === '/comic-con/',
    description: 'the event page',
  });
  assert.equal(selected, 'WEBVIEW_event');
  assert.deepEqual(current(), { context: 'WEBVIEW_event', window: 'event' });
});

void test('a detached WebView does not prevent finding another ready context', async () => {
  const { driver, current } = contextDriver({
    WEBVIEW_detached: {},
    WEBVIEW_live: { page: 'https://beta.showpass.com/account/' },
  });
  let readinessChecks = 0;
  await switchToWebview(driver, {
    matchesUrl: (url) => url.pathname === '/account/',
    isReady: async () => ++readinessChecks === 1,
    description: 'the account page',
  });
  assert.equal(current().context, 'WEBVIEW_live');
});

void test('an unready page times out and restores native controls', async () => {
  const { driver, current } = contextDriver({
    WEBVIEW_loading: { page: 'https://beta.showpass.com/account/' },
  });
  await assert.rejects(
    switchToWebview(driver, {
      matchesUrl: () => true,
      isReady: async () => false,
      description: 'the account page',
    }),
    /No inspectable WebView rendered the account page/,
  );
  assert.equal(current().context, 'NATIVE_APP');
});
