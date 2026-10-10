import assert from 'node:assert/strict';
import { baseURL, timeoutMs } from '@config/test-settings.ts';

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

export async function listPurchaseInvoices(
  email: string,
  credentials: OrganizerCredentials,
  request: InvoiceRequest = fetch,
): Promise<PurchaseInvoice[]> {
  const url = invoiceUrl('financials/invoices/');
  url.searchParams.set('email', email);
  return resultsOf<PurchaseInvoice>(await readJson(url, credentials, request));
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
