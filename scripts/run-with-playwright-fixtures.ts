import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertPurchaseItem,
  getPurchaseItems,
  listPurchaseInvoices,
  selectVerifiedInvoice,
  waitForIssuedTicket,
} from '@shared/purchase/invoice-api.ts';
import { adultTicketPurchase } from '@shared/purchase/scenario.ts';
import { purchaseRunDirectory, readPurchaseRunMarker } from '@shared/purchase/run-artifacts.ts';
import {
  parsePlaywrightAccount,
  resolveGuestDetails,
  resolveOrganizerAccount,
  type AccountValues,
} from '@scripts/account-source.ts';

// Local convenience for Playwright account fixtures. Read only literal values;
// do not execute Playwright's module or its imports.
const playwrightRepo =
  process.env.PLAYWRIGHT_REPO_PATH ??
  resolve(process.cwd(), '..', '..', 'Showpass', 'repos', 'showpass-playwright');
const fixturePath = resolve(playwrightRepo, 'fixtures/staticData/venue-users.ts');

function readFixture(name: string): AccountValues {
  return parsePlaywrightAccount(readFileSync(fixturePath, 'utf8'), name);
}

let customerFixture: AccountValues | undefined;
const customer = () => (customerFixture ??= readFixture('customerForSystemGatewayPaymentIntent'));
const organizer = resolveOrganizerAccount(process.env, () =>
  readFixture(adultTicketPurchase.organizerFixture),
);
if (process.argv[2] === 'preflight') {
  await listPurchaseInvoices(`qa+appium-preflight-${Date.now()}@example.test`, {
    userEmail: organizer.userEmail,
    userPassword: organizer.userPassword,
  });
  console.log('Beta invoice read is available to the Organizer account.');
  process.exit(0);
}
if (process.argv[2] === 'recover-public') {
  const runTag = process.argv[3];
  if (!runTag) throw new Error('Pass the exact appium-<timestamp> purchase run tag.');
  const resultPath = purchaseRunDirectory(runTag);
  const marker = readPurchaseRunMarker(runTag);
  if (!marker) {
    throw new Error(`No recovery marker exists for ${runTag}; no purchase can be attributed to this run.`);
  }
  const credentials = { userEmail: organizer.userEmail, userPassword: organizer.userPassword };
  const invoices = await listPurchaseInvoices(marker.email, credentials);
  const verified = selectVerifiedInvoice(invoices, {
    email: marker.email,
    createdAfter: new Date(marker.startedAt),
    expectedSource: adultTicketPurchase.expectedPublicSource,
    scenario: adultTicketPurchase,
  });
  if (!verified) throw new Error('The exact Appium order did not pass invoice verification.');
  const items = await getPurchaseItems(verified, credentials);
  assertPurchaseItem(items, adultTicketPurchase);
  await waitForIssuedTicket(verified, credentials, adultTicketPurchase);
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
  'organizer-navigation': 'ios/organizer.navigation.ts',
  public: 'ios/public.purchase.ts',
}[process.argv[2] ?? 'public'];
if (!spec)
  throw new Error(
    'Choose preflight, public, discovery, guest-discovery, organizer-navigation, or recover-public.',
  );
const guestMode = process.argv[2] === 'guest-discovery' || process.argv[2] === 'public';
const purchaseMode = process.argv[2] === 'public';
const navigationMode = process.argv[2] === 'organizer-navigation';
const runTag = process.env.PUBLIC_RUN_TAG ?? `appium-${Date.now()}`;
const guest = guestMode ? resolveGuestDetails(process.env, runTag, customer) : undefined;
const sessionArtifacts = purchaseMode
  ? purchaseRunDirectory(runTag)
  : navigationMode
    ? resolve(process.env.APPIUM_ARTIFACT_DIR ?? 'artifacts/ios-app', 'organizer-navigation', 'runs', runTag)
    : undefined;
if (purchaseMode) {
  if (!guest) throw new Error('Public purchase requires guest details.');
  console.log(`Purchase run: ${runTag}`);
  console.log(`Recovery marker and JUnit: ${sessionArtifacts}`);
  await listPurchaseInvoices(guest.email, {
    userEmail: organizer.userEmail,
    userPassword: organizer.userPassword,
  });
  console.log('Invoice read preflight passed.');
  console.log(
    'Starting the iPhone Appium test. Watch the booted Simulator; wait for the final pass/fail result here.',
  );
}
if (navigationMode) console.log(`Organizer navigation JUnit: ${sessionArtifacts}`);
const child = spawn(
  resolve('node_modules', '.bin', 'wdio'),
  ['run', './wdio.conf.ts', '--spec', `./tests/${spec}`],
  {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: {
      ...process.env,
      TARGET: 'ios-app',
      PURCHASE_RUN: navigationMode ? '0' : '1',
      ORGANIZER_NAVIGATION_RUN: navigationMode ? '1' : '0',
      RESET_APP: process.env.RESET_APP ?? (navigationMode ? '0' : '1'),
      ...(sessionArtifacts ? { APPIUM_SESSION_ARTIFACT_DIR: sessionArtifacts } : {}),
      ...(guestMode ? { PUBLIC_RUN_TAG: runTag } : {}),
      ...(!guestMode && !navigationMode
        ? {
            SHOWPASS_CUSTOMER_EMAIL: customer().userEmail,
            SHOWPASS_CUSTOMER_PASSWORD: customer().userPassword,
          }
        : {}),
      ...(purchaseMode || navigationMode
        ? {
            SHOWPASS_ORGANIZER_EMAIL: organizer.userEmail,
            SHOWPASS_ORGANIZER_PASSWORD: organizer.userPassword,
          }
        : {}),
      ...(guest
        ? {
            PUBLIC_CHECKOUT_MODE: 'guest',
            PUBLIC_GUEST_EMAIL: guest.email,
            PUBLIC_GUEST_NAME: guest.name,
            PUBLIC_GUEST_PHONE: guest.phone,
          }
        : {}),
    },
  },
);
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});
