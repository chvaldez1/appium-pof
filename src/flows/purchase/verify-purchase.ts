import assert from 'node:assert/strict';
import { pollIntervalMs, timeoutMs } from '@config/test-settings.ts';
import { centsPerDollar, type PurchaseScenario } from '@data/purchase-scenario.ts';
import {
  listPurchaseInvoices,
  getPurchaseTicketStatus,
  type OrganizerCredentials,
  type InvoiceRequest,
  type PurchaseInvoice,
  type PurchaseInvoiceItem,
} from '@api/purchase-invoices.ts';

export function assertRateCard(scenario: PurchaseScenario): void {
  assert.equal(
    Object.values(scenario.cardRateCents).reduce((sum, cents) => sum + cents, 0),
    scenario.expectedCardTotalCents,
    `${scenario.eventName} ${scenario.ticketName} rate must add up to its expected total.`,
  );
}

export function selectVerifiedInvoice(
  invoices: PurchaseInvoice[],
  {
    email,
    createdAfter,
    expectedSource,
    scenario,
  }: { email: string; createdAfter: Date; expectedSource: string; scenario: PurchaseScenario },
): PurchaseInvoice | undefined {
  const matches = invoices.filter(
    (invoice) =>
      invoice.email?.toLowerCase() === email.toLowerCase() &&
      Date.parse(invoice.created) >= createdAfter.getTime(),
  );
  if (matches.length === 0) return undefined;
  assert.equal(
    matches.length,
    scenario.expectedOrders,
    'The unique test email matched more than one recent order.',
  );
  const invoice = matches[0];
  assert.ok(
    Number.isSafeInteger(invoice.venue_id) && invoice.venue_id > 0,
    'The order has no verified Venue ID.',
  );
  assert.equal(invoice.venue, invoice.venue_id, 'The invoice Venue fields disagree.');
  assert.equal(invoice.venue_id, scenario.venueId, 'The order belongs to an unexpected Venue.');
  assert.equal(
    invoice.purchase_source_platform,
    expectedSource,
    'The order has an unexpected purchase source.',
  );
  assert.equal(
    Math.round(Number(invoice.final_amount) * centsPerDollar),
    scenario.expectedCardTotalCents,
    `The charged amount differs from the ${scenario.eventName} ${scenario.ticketName} card rate.`,
  );
  assert.equal(
    invoice.card_last4,
    scenario.testCard.number.slice(-4),
    'The saved card does not match the test card.',
  );
  assert.match(
    invoice.transaction_id,
    /^[0-9a-f]{2}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    'The order has no valid transaction reference.',
  );
  return invoice;
}

export async function waitForVerifiedInvoice(options: {
  email: string;
  createdAfter: Date;
  expectedSource: string;
  scenario: PurchaseScenario;
  credentials: OrganizerCredentials;
  request?: InvoiceRequest;
  timeoutMs?: number;
}): Promise<PurchaseInvoice> {
  const deadline = Date.now() + (options.timeoutMs ?? timeoutMs.orderFinalization);
  while (Date.now() < deadline) {
    const invoices = await listPurchaseInvoices(options.email, options.credentials, options.request);
    const invoice = selectVerifiedInvoice(invoices, options);
    if (invoice) return invoice;
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs.invoice));
  }
  throw new Error(
    'The completed order was not found by its unique Customer email. Do not submit a second payment until its status is known.',
  );
}

export function assertPurchaseItem(
  items: PurchaseInvoiceItem[],
  scenario: PurchaseScenario,
): PurchaseInvoiceItem {
  const saleItems = items.filter(
    (item) =>
      item.event?.name === scenario.eventName &&
      item.description.toLowerCase().includes(scenario.ticketName.toLowerCase()),
  );
  assert.equal(
    saleItems.length,
    scenario.expectedLineItems,
    `Expected ${scenario.expectedLineItems} ${scenario.eventName} ${scenario.ticketName} invoice item(s).`,
  );
  assert.equal(
    saleItems.reduce((sum, item) => sum + item.quantity, 0),
    scenario.quantity,
    `Expected ${scenario.quantity} ${scenario.ticketName} ticket(s).`,
  );
  for (const item of saleItems) assert.notEqual(item.is_voided, true, 'The ticket is voided.');
  return saleItems[0];
}

export async function waitForIssuedTicket(
  invoice: PurchaseInvoice,
  credentials: OrganizerCredentials,
  scenario: PurchaseScenario,
  request: InvoiceRequest = fetch,
  maxWaitMs = timeoutMs.orderFinalization,
): Promise<void> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const data = await getPurchaseTicketStatus(invoice, credentials, request);
    if (data.ready) {
      const tickets = data.items?.filter((item) => item.event_name === scenario.eventName) ?? [];
      assert.equal(
        tickets.length,
        scenario.quantity,
        `Expected ${scenario.quantity} issued ${scenario.eventName} ticket(s).`,
      );
      for (const ticket of tickets) {
        assert.ok(ticket.barcode_string, 'An issued ticket has no barcode.');
      }
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs.invoice));
  }
  throw new Error(
    `The order exists, but the ${scenario.eventName} ticket was not issued before the timeout.`,
  );
}
