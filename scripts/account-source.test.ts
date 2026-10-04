import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parsePlaywrightAccount, resolveGuestDetails, resolveOrganizerAccount } from './account-source.ts';

const noFixture = () => {
  throw new Error('The Playwright clone must not be read for an environment-backed job.');
};

void test('runs from protected environment values without reading the Playwright clone', () => {
  assert.deepEqual(
    resolveOrganizerAccount(
      { SHOWPASS_ORGANIZER_EMAIL: 'organizer@example.test', SHOWPASS_ORGANIZER_PASSWORD: 'secret' },
      noFixture,
    ),
    { userEmail: 'organizer@example.test', userPassword: 'secret' },
  );
  assert.deepEqual(
    resolveGuestDetails(
      {
        PUBLIC_GUEST_EMAIL_BASE: 'qa@example.test',
        PUBLIC_GUEST_NAME: 'QA Guest',
        PUBLIC_GUEST_PHONE: '8885551100',
      },
      'appium-123',
      noFixture,
    ),
    { email: 'qa+appium-123@example.test', name: 'QA Guest', phone: '8885551100' },
  );
  assert.throws(
    () => resolveOrganizerAccount({ SHOWPASS_ORGANIZER_EMAIL: 'organizer@example.test' }, noFixture),
    /Set both/,
  );
});

void test('parses only the expected literal account fields from a local fixture', () => {
  const source = `export const users = { organizer: {
    userEmail: "organizer@example.test", userPassword: "secret",
    userFirstName: "QA", userLastName: "Manager", phoneNumber: "8885551100"
  } };`;
  assert.deepEqual(parsePlaywrightAccount(source, 'organizer'), {
    userEmail: 'organizer@example.test',
    userPassword: 'secret',
    userFirstName: 'QA',
    userLastName: 'Manager',
    phoneNumber: '8885551100',
  });
});
