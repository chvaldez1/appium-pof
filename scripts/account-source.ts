import assert from 'node:assert/strict';
import { createGuestEmail } from '@shared/purchase/guest.ts';

export interface AccountValues {
  userEmail: string;
  userPassword: string;
  userFirstName?: string;
  userLastName?: string;
  phoneNumber?: string;
}

// Parse literal local fixture values without importing Playwright or executing fixture code.
export function parsePlaywrightAccount(source: string, name: string): AccountValues {
  const body = source.match(new RegExp(`\\b${name}:\\s*\\{([^}]*)\\}`))?.[1];
  if (!body) throw new Error(`Playwright fixture ${name} was not found.`);
  const values: Record<string, string> = {};
  for (const key of ['userEmail', 'userPassword', 'userFirstName', 'userLastName', 'phoneNumber']) {
    const literal = body.match(new RegExp(`\\b${key}:\\s*(["'])([^"'\\n]*)\\1`));
    if (literal) values[key] = literal[2];
  }
  for (const key of ['userEmail', 'userPassword']) {
    if (!values[key]) throw new Error(`Playwright fixture ${name} has no literal ${key}.`);
  }
  return {
    userEmail: values.userEmail,
    userPassword: values.userPassword,
    ...(values.userFirstName ? { userFirstName: values.userFirstName } : {}),
    ...(values.userLastName ? { userLastName: values.userLastName } : {}),
    ...(values.phoneNumber ? { phoneNumber: values.phoneNumber } : {}),
  };
}

export function resolveOrganizerAccount(
  env: NodeJS.ProcessEnv,
  fallback: () => AccountValues,
): Pick<AccountValues, 'userEmail' | 'userPassword'> {
  const email = env.SHOWPASS_ORGANIZER_EMAIL;
  const password = env.SHOWPASS_ORGANIZER_PASSWORD;
  if (email || password) {
    assert.ok(email && password, 'Set both SHOWPASS_ORGANIZER_EMAIL and SHOWPASS_ORGANIZER_PASSWORD.');
    return { userEmail: email, userPassword: password };
  }
  return fallback();
}

export function resolveGuestDetails(
  env: NodeJS.ProcessEnv,
  runTag: string,
  fallback: () => AccountValues,
): { email: string; name: string; phone: string } {
  let fixture: AccountValues | undefined;
  const customer = () => (fixture ??= fallback());
  const email =
    env.PUBLIC_GUEST_EMAIL ?? createGuestEmail(env.PUBLIC_GUEST_EMAIL_BASE ?? customer().userEmail, runTag);
  const name =
    env.PUBLIC_GUEST_NAME ?? [customer().userFirstName, customer().userLastName].filter(Boolean).join(' ');
  const phone = env.PUBLIC_GUEST_PHONE ?? customer().phoneNumber;
  assert.ok(email && name && phone, 'Guest email, name, and phone are required.');
  return { email, name, phone };
}
