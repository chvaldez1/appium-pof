import { pollIntervalMs, timeoutMs } from '@config/test-settings.ts';
import { contextId } from '@support/contexts/context-id.ts';

// Both XCUITest and UiAutomator2 expose this WebDriver context/window boundary.
export interface WebviewDriver {
  getContexts(): Promise<unknown[]>;
  switchContext(context: string): Promise<unknown>;
  getWindowHandles(): Promise<string[]>;
  switchToWindow(handle: string): Promise<unknown>;
  getUrl(): Promise<string>;
  waitUntil(
    condition: () => Promise<boolean>,
    options: { timeout: number; interval: number; timeoutMsg: string },
  ): Promise<unknown>;
}

/** Leaves the matching window selected; restores native mode on failure. */
export async function switchToWebview(
  driver: WebviewDriver,
  {
    matchesUrl,
    isReady = async () => true,
    description,
  }: {
    matchesUrl: (url: URL) => boolean;
    isReady?: () => Promise<boolean>;
    description: string;
  },
): Promise<string> {
  let selected: string | undefined;
  try {
    await driver.waitUntil(
      async () => {
        await driver.switchContext('NATIVE_APP');
        const contexts = (await driver.getContexts()).map(contextId);
        for (const id of contexts) {
          if (!id?.startsWith('WEBVIEW')) continue;
          try {
            await driver.switchContext(id);
            for (const handle of await driver.getWindowHandles()) {
              try {
                await driver.switchToWindow(handle);
                const url = new URL(await driver.getUrl());
                if (matchesUrl(url) && (await isReady())) {
                  selected = id;
                  return true;
                }
              } catch {
                // One stale window must not hide another live page in the same context.
              }
            }
          } catch {
            // Contexts/windows can detach or still have an about:blank page while loading.
            // Retry discovery within the same bounded wait; never retry a user action here.
          } finally {
            if (!selected) await driver.switchContext('NATIVE_APP');
          }
        }
        return false;
      },
      {
        timeout: timeoutMs.webviewDiscovery,
        interval: pollIntervalMs.webview,
        timeoutMsg: `No inspectable WebView rendered ${description}.`,
      },
    );
    if (!selected) throw new Error(`No WebView selected for ${description}.`);
    return selected;
  } catch (error) {
    await driver.switchContext('NATIVE_APP');
    throw error;
  }
}
