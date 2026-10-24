import { browser } from '@wdio/globals';
import { pollIntervalMs, timeoutMs } from '@config/test-settings.ts';

interface IosAlertDriver {
  getAlertText(): Promise<string>;
  dismissAlert(): Promise<unknown>;
}

/** Inspect only the current alert; the caller's screen wait handles late prompts. */
export async function dismissPresentIosSystemPrompt(driver: IosAlertDriver): Promise<boolean> {
  let alert: string;
  try {
    alert = await driver.getAlertText();
  } catch (error) {
    if (/no such alert|modal dialog when one was not open/i.test(String(error))) return false;
    throw error;
  }
  if (
    !/Would Like to (?:Use Your (?:Current )?Location|Send You Notifications)|Allow .+ to use your location/i.test(
      alert,
    )
  )
    return false;
  await driver.dismissAlert();
  return true;
}

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
