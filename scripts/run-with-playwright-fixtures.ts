import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertPurchaseItem,
  getPurchaseItems,
  listPurchaseInvoices,
  selectVerifiedInvoice,
  waitForIssuedTicket,
} from '../test/shared/purchase/invoice-api.ts';
import { createGuestEmail } from '../test/shared/purchase/guest.ts';
import { adultTicketPurchase } from '../test/shared/purchase/scenario.ts';

// Local convenience for Playwright account fixtures. A future hosted purchase job
// needs an environment-backed account source before it can run without that repo.
// Read only literal fixture values; do not execute Playwright's module or its imports.
const playwrightRepo =
  process.env.PLAYWRIGHT_REPO_PATH ??
  resolve(process.cwd(), '..', '..', 'Showpass', 'repos', 'showpass-playwright');
const fixturePath = resolve(playwrightRepo, 'fixtures/staticData/venue-users.ts');
const source = readFileSync(fixturePath, 'utf8');

function readFixture(name: string): Record<string, string> {
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
  return values;
}

const customer = readFixture('customerForSystemGatewayPaymentIntent');
const organizer = readFixture(adultTicketPurchase.organizerFixture);
if (process.argv[2] === 'preflight') {
  await listPurchaseInvoices(`qa+appium-preflight-${Date.now()}@example.test`, {
    userEmail: organizer.userEmail,
    userPassword: organizer.userPassword,
  });
  console.log('Beta invoice read is available to the Playwright Organizer fixture.');
  process.exit(0);
}
if (process.argv[2] === 'recover-public') {
  const runTag = process.argv[3];
  if (!runTag || !/^appium-\d+$/.test(runTag)) {
    throw new Error('Pass the exact appium-<timestamp> tag from artifacts/ios-app/purchase/run.json.');
  }
  const credentials = { userEmail: organizer.userEmail, userPassword: organizer.userPassword };
  const guestEmail = createGuestEmail(customer.userEmail, runTag);
  const invoices = await listPurchaseInvoices(guestEmail, credentials);
  const invoice = invoices.find((candidate) => candidate.email?.includes(runTag));
  if (!invoice) throw new Error('The exact Appium run was not found in this Venue.');
  const verified = selectVerifiedInvoice(invoices, {
    email: invoice.email,
    createdAfter: new Date(0),
    expectedSource: adultTicketPurchase.expectedPublicSource,
    scenario: adultTicketPurchase,
  });
  if (!verified) throw new Error('The exact Appium order did not pass invoice verification.');
  const items = await getPurchaseItems(verified, credentials);
  assertPurchaseItem(items, adultTicketPurchase);
  await waitForIssuedTicket(verified, credentials, adultTicketPurchase);
  const resultPath = resolve('artifacts', 'ios-app', 'purchase');
  mkdirSync(resultPath, { recursive: true });
  const result = {
    transactionId: verified.transaction_id,
    venueId: verified.venue_id,
    customerTotal: verified.final_amount,
    source: verified.purchase_source_platform,
    cardLast4: verified.card_last4,
    chargeIdPresent: Boolean(verified.charge_id),
    refunded: verified.is_refunded === true,
    adultItems: adultTicketPurchase.expectedLineItems,
    ticketIssued: true,
    uiConfirmed: null,
    verifiedFromApi: true,
  };
  writeFileSync(resolve(resultPath, 'public-result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}
const spec = {
  discovery: 'ios/explore.discovery.ts',
  'guest-discovery': 'ios/explore.discovery.ts',
  public: 'ios/public.purchase.ts',
}[process.argv[2] ?? 'public'];
if (!spec) throw new Error('Choose preflight, public, discovery, guest-discovery, or recover-public.');
const guestMode = process.argv[2] === 'guest-discovery' || process.argv[2] === 'public';
const purchaseMode = process.argv[2] === 'public';
const guestEmail =
  process.env.PUBLIC_GUEST_EMAIL ?? createGuestEmail(customer.userEmail, `appium-${Date.now()}`);
if (purchaseMode) {
  await listPurchaseInvoices(guestEmail, {
    userEmail: organizer.userEmail,
    userPassword: organizer.userPassword,
  });
  console.log('Invoice read preflight passed.');
  console.log(
    'Starting the iPhone Appium test. Watch the booted Simulator; wait for the final pass/fail result here.',
  );
}
const child = spawn(
  resolve('node_modules', '.bin', 'wdio'),
  ['run', './wdio.conf.ts', '--spec', `./test/specs/${spec}`],
  {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: {
      ...process.env,
      TARGET: 'ios-app',
      PURCHASE_RUN: '1',
      RESET_APP: process.env.RESET_APP ?? '1',
      ...(!guestMode
        ? {
            SHOWPASS_CUSTOMER_EMAIL: customer.userEmail,
            SHOWPASS_CUSTOMER_PASSWORD: customer.userPassword,
          }
        : {}),
      ...(purchaseMode
        ? {
            SHOWPASS_ORGANIZER_EMAIL: organizer.userEmail,
            SHOWPASS_ORGANIZER_PASSWORD: organizer.userPassword,
          }
        : {}),
      ...(guestMode
        ? {
            PUBLIC_CHECKOUT_MODE: 'guest',
            PUBLIC_GUEST_EMAIL: guestEmail,
            PUBLIC_GUEST_NAME: `${customer.userFirstName} ${customer.userLastName}`,
            PUBLIC_GUEST_PHONE: customer.phoneNumber,
          }
        : {}),
    },
  },
);
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});
