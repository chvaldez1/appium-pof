import assert from 'node:assert/strict';
import { preparePublicPurchase } from '@flows/buyer/ios/public-purchase.ts';
import { getPurchaseItems, listPurchaseInvoices } from '@api/purchase-invoices.ts';
import {
  assertPurchaseItem,
  assertRateCard,
  waitForIssuedTicket,
  waitForVerifiedInvoice,
} from '@flows/purchase/verify-purchase.ts';
import { adultTicketPurchase } from '@data/purchase-scenario.ts';
import {
  preparePurchaseRun,
  writePurchaseRunMarker,
  writePurchaseResult,
} from '@support/artifacts/run-artifacts.ts';
import { isPurchaseDryRun, purchaseRunTag, readPublicPurchaseInputs } from '@config/purchase-settings.ts';
import { invoiceSearchLookbackMs } from '@config/test-settings.ts';

describe('Comic Con public purchase in the beta iPhone app', () => {
  it(
    isPurchaseDryRun()
      ? 'prepares one Adult test-card purchase without submitting it'
      : 'buys and verifies one Adult ticket with the test card',
    async () => {
      const scenario = adultTicketPurchase;
      assertRateCard(scenario);
      const { guest, credentials } = readPublicPurchaseInputs();
      const { email } = guest;
      const createdAfter = new Date(Date.now() - invoiceSearchLookbackMs);
      const existing = await listPurchaseInvoices(email, credentials);
      assert.equal(
        existing.filter((invoice) => invoice.email?.toLowerCase() === email.toLowerCase()).length,
        0,
        'Use a fresh guest email so this test can identify one new order.',
      );

      const runTag = purchaseRunTag();
      preparePurchaseRun(runTag);
      const prepared = await preparePublicPurchase(guest, scenario);
      if (isPurchaseDryRun()) {
        console.log('Public checkout: dry run complete; payment was not submitted.');
        return;
      }

      // Kept locally even if payment succeeds but later UI/API verification fails.
      writePurchaseRunMarker({ runTag, email, startedAt: createdAfter.toISOString() });
      console.log('Public checkout: submitting one test payment.');
      const { transactionId, checkoutError } = await prepared.submitOnce();
      console.log('Public checkout: verifying the saved order and issued ticket.');
      const invoice = await waitForVerifiedInvoice({
        email,
        createdAfter,
        expectedSource: scenario.expectedPublicSource,
        scenario,
        credentials,
      });
      const result = {
        transactionId: invoice.transaction_id,
        venueId: invoice.venue_id,
        customerTotal: invoice.final_amount,
        source: invoice.purchase_source_platform,
        cardLast4: invoice.card_last4,
        uiConfirmed: transactionId === invoice.transaction_id,
        ticketIssued: false,
      };
      writePurchaseResult(runTag, result);
      assertPurchaseItem(await getPurchaseItems(invoice, credentials), scenario);
      await waitForIssuedTicket(invoice, credentials, scenario);
      result.ticketIssued = true;
      writePurchaseResult(runTag, result);
      if (checkoutError) throw checkoutError;
      assert.equal(
        transactionId,
        invoice.transaction_id,
        'The order shown in the app must match the saved transaction.',
      );
      console.log('Public checkout: order and issued ticket verified.');
    },
  );
});
