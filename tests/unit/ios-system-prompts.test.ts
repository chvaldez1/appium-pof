import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dismissPresentIosSystemPrompt } from '@support/permissions/ios-system-prompts.ts';

void test('an absent iOS prompt performs one inspection without waiting for its grace period', async () => {
  let inspections = 0;
  const dismissed = await dismissPresentIosSystemPrompt({
    getAlertText: async () => {
      inspections += 1;
      throw new Error('An attempt was made to operate on a modal dialog when one was not open');
    },
    dismissAlert: async () => assert.fail('There is no alert to dismiss.'),
  });
  assert.equal(dismissed, false);
  assert.equal(inspections, 1);
});

void test('only known location and notification prompts are dismissed', async () => {
  for (const alert of [
    'Showpass Would Like to Use Your Current Location',
    'Showpass Would Like to Send You Notifications',
    'Location lookup failed. Retry?',
    'Payment failed. Retry?',
  ]) {
    let dismissals = 0;
    await dismissPresentIosSystemPrompt({
      getAlertText: async () => alert,
      dismissAlert: async () => {
        dismissals += 1;
      },
    });
    assert.equal(dismissals, alert.startsWith('Showpass') ? 1 : 0);
  }
});

void test('iOS prompt inspection preserves driver failures instead of reporting no prompt', async () => {
  await assert.rejects(
    dismissPresentIosSystemPrompt({
      getAlertText: async () => {
        throw new Error('WebDriverAgent connection refused');
      },
      dismissAlert: async () => assert.fail('The driver is unavailable.'),
    }),
    /WebDriverAgent connection refused/,
  );
});
