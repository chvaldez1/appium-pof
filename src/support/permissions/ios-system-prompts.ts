import { browser } from '@wdio/globals';
import { pollIntervalMs, timeoutMs } from '@config/test-settings.ts';

async function dismissOptionalPrompt(pattern: RegExp): Promise<void> {
  const deadline = Date.now() + timeoutMs.systemPrompt;
  while (Date.now() < deadline) {
    const alert = await browser.getAlertText().catch(() => '');
    if (alert) {
      if (pattern.test(alert)) await browser.dismissAlert();
      return;
    }
    await browser.pause(pollIntervalMs.systemPrompt);
  }
}

export function dismissOptionalLocationPrompt(): Promise<void> {
  return dismissOptionalPrompt(/location/i);
}

export function dismissOptionalNotificationPrompt(): Promise<void> {
  return dismissOptionalPrompt(/Would Like to Send You Notifications/i);
}
