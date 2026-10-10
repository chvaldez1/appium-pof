import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isPurchaseDryRun, purchaseRunTag, readPublicPurchaseInputs } from '@config/purchase-settings.ts';

void test('purchase settings validate the launcher handoff without falling back to another account', () => {
  const env = {
    PUBLIC_GUEST_EMAIL: 'qa+appium-123@example.test',
    PUBLIC_GUEST_NAME: 'QA Guest',
    PUBLIC_GUEST_PHONE: '8885551100',
    SHOWPASS_ORGANIZER_EMAIL: 'organizer@example.test',
    SHOWPASS_ORGANIZER_PASSWORD: 'test-password',
    PUBLIC_RUN_TAG: 'appium-123',
    DRY_RUN: '1',
  };
  const { guest, credentials } = readPublicPurchaseInputs(env);
  assert.equal(guest.email, env.PUBLIC_GUEST_EMAIL);
  assert.equal(credentials.userEmail, env.SHOWPASS_ORGANIZER_EMAIL);
  assert.equal(purchaseRunTag(env), env.PUBLIC_RUN_TAG);
  assert.equal(isPurchaseDryRun(env), true);
  assert.equal(isPurchaseDryRun({}), false);
  assert.throws(
    () => readPublicPurchaseInputs({ ...env, SHOWPASS_ORGANIZER_PASSWORD: undefined }),
    /Run through/,
  );
  assert.throws(() => readPublicPurchaseInputs({ ...env, PUBLIC_GUEST_PHONE: undefined }), /Run through/);
});
