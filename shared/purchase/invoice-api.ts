import assert from 'node:assert/strict';
import { baseURL, pollIntervalMs, timeoutMs } from '@config/test-settings.ts';
import { centsPerDollar, type PurchaseScenario } from '@shared/purchase/scenario.ts';

export type OrganizerCredentials = { userEmail: string; userPassword: string };
export type InvoiceRequest = (url: URL, options: RequestInit) => Promise<Response>;

export interface PurchaseInvoice {
  id: number;
  transaction_id: string;
  email: string;
  created: string;
  amount_paid: string | number;
  final_amount: string | number;
  items_total_amount: string | number;
  card_last4: string;
  charge_id?: string | null;
  is_refunded?: boolean;
  purchase_source_platform: string;
  venue_id: number;
  venue: number;
}

export interface PurchaseInvoiceItem {
  id: number;
  description: string;
  quantity: number;
  event: { name: string } | null;
  is_voided: boolean | null;
}

function invoiceUrl(path: string): URL {
  return new URL(`/api/venue/${path}`, baseURL);
}

async function readJson(
  url: URL,
  credentials: OrganizerCredentials,
  request: InvoiceRequest,
): Promise<unknown> {
  assert.ok(credentials.userEmail && credentials.userPassword, 'Organizer credentials are required.');
  const response = await request(url, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${Buffer.from(`${credentials.userEmail}:${credentials.userPassword}`).toString('base64')}`,
    },
    signal: AbortSignal.timeout(timeoutMs.apiRead),
  });
  if (!response.ok) throw new Error(`Invoice read failed (HTTP ${response.status}) at ${url.pathname}.`);
  return response.json();
}

function resultsOf<T>(data: unknown): T[] {
  assert.ok(
    data && typeof data === 'object' && 'results' in data && Array.isArray(data.results),
    'Invoice API returned an unexpected list shape.',
  );
  return data.results as T[];
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

export async function listPurchaseInvoices(
  email: string,
  credentials: OrganizerCredentials,
  request: InvoiceRequest = fetch,
): Promise<PurchaseInvoice[]> {
  const url = invoiceUrl('financials/invoices/');
  url.searchParams.set('email', email);
  return resultsOf<PurchaseInvoice>(await readJson(url, credentials, request));
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

export async function getPurchaseItems(
  invoice: PurchaseInvoice,
  credentials: OrganizerCredentials,
  request: InvoiceRequest = fetch,
): Promise<PurchaseInvoiceItem[]> {
  const url = invoiceUrl(`${invoice.venue_id}/financials/invoices/items/`);
  url.searchParams.set('invoice', String(invoice.id));
  return resultsOf<PurchaseInvoiceItem>(await readJson(url, credentials, request));
}

export async function getPurchaseTicketStatus(
  invoice: PurchaseInvoice,
  credentials: OrganizerCredentials,
  request: InvoiceRequest = fetch,
): Promise<{ ready: boolean; items: Array<{ event_name?: string; barcode_string?: string }> }> {
  return (await readJson(
    invoiceUrl(`${invoice.venue_id}/financials/invoices/${invoice.transaction_id}/tickets/`),
    credentials,
    request,
  )) as { ready: boolean; items: Array<{ event_name?: string; barcode_string?: string }> };
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
