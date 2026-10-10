import '@config/local-env.ts';
import assert from 'node:assert/strict';
import type { OrganizerCredentials } from '@api/purchase-invoices.ts';

export function isPurchaseDryRun(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.DRY_RUN === '1';
}

export function purchaseRunTag(env: NodeJS.ProcessEnv = process.env): string {
  return env.PUBLIC_RUN_TAG ?? `appium-${Date.now()}`;
}

// The launcher resolves fixture data before starting the WebdriverIO process.
export function readPublicPurchaseInputs(env: NodeJS.ProcessEnv = process.env): {
  guest: { email: string; name: string; phone: string };
  credentials: OrganizerCredentials;
} {
  const email = env.PUBLIC_GUEST_EMAIL;
  const name = env.PUBLIC_GUEST_NAME;
  const phone = env.PUBLIC_GUEST_PHONE;
  const organizerEmail = env.SHOWPASS_ORGANIZER_EMAIL;
  const organizerPassword = env.SHOWPASS_ORGANIZER_PASSWORD;
  assert.ok(
    email && name && phone && organizerEmail && organizerPassword,
    'Run through scripts/run-with-playwright-fixtures.ts public or provide guest and Organizer environment values.',
  );
  return {
    guest: { email, name, phone },
    credentials: { userEmail: organizerEmail, userPassword: organizerPassword },
  };
}
