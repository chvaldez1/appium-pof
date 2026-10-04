import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertPurchaseItem,
  listPurchaseInvoices,
  selectVerifiedInvoice,
  waitForIssuedTicket,
  type PurchaseInvoice,
} from './invoice-api.ts';
import { adultTicketPurchase } from './scenario.ts';

const invoice: PurchaseInvoice = {
  id: 72,
  transaction_id: '12-3456-789a-bcde-f0123456789a',
  email: 'qa+appium-123@example.test',
  created: '2026-10-03T20:00:00Z',
  amount_paid: '25.46',
  final_amount: '25.46',
  items_total_amount: '20.00',
  card_last4: '4242',
  purchase_source_platform: 'psp_web',
  venue_id: 1547,
  venue: 1547,
};
const query = {
  email: invoice.email,
  createdAfter: new Date('2026-10-03T19:59:00Z'),
  expectedSource: 'psp_web',
  scenario: adultTicketPurchase,
};

void test('selects only the unique, recent order in the correct Venue with the correct total and card', () => {
  assert.equal(selectVerifiedInvoice([invoice], query), invoice);
  assert.equal(selectVerifiedInvoice([invoice], { ...query, email: 'other@example.test' }), undefined);
  assert.equal(
    selectVerifiedInvoice([invoice], { ...query, createdAfter: new Date('2026-10-03T20:01:00Z') }),
    undefined,
  );
  assert.throws(() => selectVerifiedInvoice([invoice, invoice], query), /more than one recent order/);
  assert.throws(() => selectVerifiedInvoice([{ ...invoice, venue: 43 }], query), /Venue fields disagree/);
  assert.throws(
    () => selectVerifiedInvoice([{ ...invoice, venue_id: 42, venue: 42 }], query),
    /unexpected Venue/,
  );
  assert.throws(
    () => selectVerifiedInvoice([{ ...invoice, final_amount: '20.00' }], query),
    /charged amount/,
  );
  assert.throws(
    () => selectVerifiedInvoice([{ ...invoice, purchase_source_platform: 'psp_web_public' }], query),
    /purchase source/,
  );
});

void test('checks the saved Comic Con Adult item', () => {
  const item = {
    id: 19,
    description: 'Comic Con Adult',
    quantity: 1,
    event: { name: 'Comic Con' },
    is_voided: false,
  };
  assert.equal(assertPurchaseItem([item], adultTicketPurchase), item);
  assert.throws(() => assertPurchaseItem([{ ...item, quantity: 2 }], adultTicketPurchase), /Adult ticket/);
  assert.throws(
    () => assertPurchaseItem([{ ...item, is_voided: true }], adultTicketPurchase),
    /ticket is voided/,
  );
});

void test('uses the supplied scenario for a different purchase', () => {
  const scenario = {
    ...adultTicketPurchase,
    eventName: 'Another Event',
    ticketName: 'General Admission',
    venueId: 42,
    cardRateCents: { item: 3000 },
    expectedCardTotalCents: 3000,
  };
  const otherInvoice = {
    ...invoice,
    venue: 42,
    venue_id: 42,
    final_amount: '30.00',
  };
  assert.equal(selectVerifiedInvoice([otherInvoice], { ...query, scenario }), otherInvoice);
  const item = {
    id: 20,
    description: 'General Admission',
    quantity: 1,
    event: { name: 'Another Event' },
    is_voided: false,
  };
  assert.equal(assertPurchaseItem([item], scenario), item);
});

void test('reads invoices with the backend exact-email filter', async () => {
  const invoices = await listPurchaseInvoices(
    invoice.email,
    { userEmail: 'organizer@example.test', userPassword: 'test' },
    async (url) => {
      assert.equal(url.searchParams.get('email'), invoice.email);
      assert.equal(url.searchParams.has('search'), false);
      return Response.json({ results: [invoice] });
    },
  );
  assert.deepEqual(invoices, [invoice]);
});

void test('requires a barcode for every issued ticket in a multi-ticket scenario', async () => {
  await assert.rejects(
    waitForIssuedTicket(
      invoice,
      { userEmail: 'organizer@example.test', userPassword: 'test' },
      { ...adultTicketPurchase, quantity: 2 },
      async () =>
        Response.json({
          ready: true,
          items: [
            { event_name: 'Comic Con', barcode_string: 'ticket-one' },
            { event_name: 'Comic Con', barcode_string: '' },
          ],
        }),
    ),
    /no barcode/,
  );
});
