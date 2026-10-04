import assert from 'node:assert/strict';
import { calgaryBillingAddress, stripeVisaAccepted } from '../data/checkout.ts';
import { comicConAdult } from '../data/comic-con.ts';

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
  expectedPublicSource: 'psp_web',
  expectedMobileBoxOfficeSource: 'psp_mobile_box_office',
} satisfies PurchaseScenario;

export const centsPerDollar = 100;

export function expectedCardTotalText(scenario: PurchaseScenario): string {
  return `$${(scenario.expectedCardTotalCents / centsPerDollar).toFixed(2)}`;
}

export function assertRateCard(scenario: PurchaseScenario): void {
  assert.equal(
    Object.values(scenario.cardRateCents).reduce((sum, cents) => sum + cents, 0),
    scenario.expectedCardTotalCents,
    `${scenario.eventName} ${scenario.ticketName} rate must add up to its expected total.`,
  );
}
