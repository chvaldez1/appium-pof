import { browser } from '@wdio/globals';
import type { ChainablePromiseElement } from 'webdriverio';
import { pauseMs, timeoutMs } from '@config/test-settings.ts';

// Plain-text native fields only; do not read back masked passwords or card security fields.
export async function enterIosText(input: ChainablePromiseElement, value: string): Promise<void> {
  const read = async () => {
    const text = await input.getValue();
    return text === (await input.getAttribute('placeholderValue')) ? '' : text;
  };
  const waitForValue = async (text: string) => {
    await browser.waitUntil(async () => (await read()) === text, {
      timeout: timeoutMs.uiControl,
      timeoutMsg: 'An iOS text field did not retain the entered text.',
    });
  };

  await input.setValue(value);
  await browser.pause(pauseMs.nativeTextCommit);
  if ((await read()) !== value) {
    // Controlled React Native inputs can lose characters during fast XCTest typing.
    await input.clearValue();
    await waitForValue('');
    let entered = '';
    for (const character of value) {
      await input.addValue(character);
      entered += character;
      await waitForValue(entered);
    }
    await browser.pause(pauseMs.nativeTextCommit);
  }
  await waitForValue(value);
}
