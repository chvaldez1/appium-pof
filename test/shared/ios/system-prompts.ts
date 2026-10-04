import { browser } from '@wdio/globals';
import { pollIntervalMs, timeoutMs } from '../../settings.ts';

export async function dismissOptionalLocationPrompt(): Promise<void> {
  const deadline = Date.now() + timeoutMs.systemPrompt;
  while (Date.now() < deadline) {
    const alert = await browser.getAlertText().catch(() => '');
    if (alert) {
      if (/location/i.test(alert)) await browser.dismissAlert();
      return;
    }
    await browser.pause(pollIntervalMs.systemPrompt);
  }
}
