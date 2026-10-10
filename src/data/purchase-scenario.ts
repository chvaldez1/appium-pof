import { calgaryBillingAddress, stripeVisaAccepted } from '@data/static/checkout.ts';
import { comicConAdult } from '@data/static/comic-con.ts';

export interface PurchaseScenario {
  eventUrl: string;
  eventName: string;
  venueId: number;
  ticketName: string;
  quantity: number;
  expectedOrders: 1;
  expectedLineItems: number;
  organizerFixture: string;
  testCard: {
    nameOnCard: string;
    number: string;
    expiry: string;
    cvc: string;
  };
  billingAddress: {
    street: string;
    unit: string;
    city: string;
    country: string;
    province: string;
    postal: string;
  };
  expectedPublicSource: string;
  expectedMobileBoxOfficeSource: string;
  cardRateCents: Record<string, number>;
  expectedCardTotalCents: number;
}

// Compose fixed product and checkout inputs; platform UI stays elsewhere.
export const adultTicketPurchase = {
  ...comicConAdult,
  expectedOrders: 1,
  expectedLineItems: 1,
  organizerFixture: 'organizationForSystemGatewayPaymentIntent',
  testCard: stripeVisaAccepted,
  billingAddress: calgaryBillingAddress,
  // The native app's embedded checkout records Mobile, even though its UI is a WebView.
  expectedPublicSource: 'psp_mobile',
  expectedMobileBoxOfficeSource: 'psp_mobile_box_office',
} satisfies PurchaseScenario;

export const centsPerDollar = 100;

export function expectedCardTotalText(scenario: PurchaseScenario): string {
  return `$${(scenario.expectedCardTotalCents / centsPerDollar).toFixed(2)}`;
}
