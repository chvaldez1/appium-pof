import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { preparePublicPurchase } from '../../flows/ios/buyer/public-purchase.ts';
import {
  assertPurchaseItem,
  getPurchaseItems,
  listPurchaseInvoices,
  waitForIssuedTicket,
  waitForVerifiedInvoice,
} from '../../shared/purchase/invoice-api.ts';
import { adultTicketPurchase, assertRateCard } from '../../shared/purchase/scenario.ts';
import { purchaseRunDirectory } from '../../shared/purchase/run-artifacts.ts';
import { invoiceSearchLookbackMs } from '../../settings.ts';

describe('Comic Con public purchase in the beta iPhone app', () => {
  it(
    process.env.DRY_RUN === '1'
      ? 'prepares one Adult test-card purchase without submitting it'
      : 'buys and verifies one Adult ticket with the test card',
    async () => {
      const scenario = adultTicketPurchase;
      assertRateCard(scenario);
      const email = process.env.PUBLIC_GUEST_EMAIL;
      const name = process.env.PUBLIC_GUEST_NAME;
      const phone = process.env.PUBLIC_GUEST_PHONE;
      const organizerEmail = process.env.SHOWPASS_ORGANIZER_EMAIL;
      const organizerPassword = process.env.SHOWPASS_ORGANIZER_PASSWORD;
      assert.ok(
        email && name && phone && organizerEmail && organizerPassword,
        'Run through scripts/run-with-playwright-fixtures.ts public or provide guest and Organizer environment values.',
      );
      const credentials = { userEmail: organizerEmail, userPassword: organizerPassword };
      const createdAfter = new Date(Date.now() - invoiceSearchLookbackMs);
      const existing = await listPurchaseInvoices(email, credentials);
      assert.equal(
        existing.filter((invoice) => invoice.email?.toLowerCase() === email.toLowerCase()).length,
        0,
        'Use a fresh guest email so this test can identify one new order.',
      );

      const runTag = process.env.PUBLIC_RUN_TAG ?? `appium-${Date.now()}`;
      const output = purchaseRunDirectory(runTag);
      assert.ok(
        !existsSync(resolve(output, 'run.json')),
        `Purchase run ${runTag} already exists. Recover that run before starting another payment.`,
      );
      mkdirSync(output, { recursive: true });
      const prepared = await preparePublicPurchase({ name, email, phone }, scenario);
      if (process.env.DRY_RUN === '1') return;

      // Kept locally even if payment succeeds but later UI/API verification fails.
      writeFileSync(
        resolve(output, 'run.json'),
        JSON.stringify({ runTag, email, startedAt: createdAfter.toISOString() }, null, 2),
      );
      const { transactionId, checkoutError } = await prepared.submitOnce();
      const invoice = await waitForVerifiedInvoice({
        email,
        createdAfter,
        expectedSource: scenario.expectedPublicSource,
        scenario,
        credentials,
      });
      const resultFile = resolve(output, 'public-result.json');
      const result = {
        transactionId: invoice.transaction_id,
        venueId: invoice.venue_id,
        customerTotal: invoice.final_amount,
        source: invoice.purchase_source_platform,
        cardLast4: invoice.card_last4,
        uiConfirmed: transactionId === invoice.transaction_id,
        ticketIssued: false,
      };
      writeFileSync(resultFile, JSON.stringify(result, null, 2));
      assertPurchaseItem(await getPurchaseItems(invoice, credentials), scenario);
      await waitForIssuedTicket(invoice, credentials, scenario);
      result.ticketIssued = true;
      writeFileSync(resultFile, JSON.stringify(result, null, 2));
      if (checkoutError) throw checkoutError;
      assert.equal(
        transactionId,
        invoice.transaction_id,
        'The order shown in the app must match the saved transaction.',
      );
    },
  );
});
