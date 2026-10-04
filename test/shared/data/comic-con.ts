// The Comic Con Adult rate card supplied for beta Mobile and Mobile Box Office.
export const comicConAdult = {
  eventUrl: 'https://beta.showpass.com/comic-con/',
  eventName: 'Comic Con',
  venueId: 1547,
  ticketName: 'Adult',
  quantity: 1,
  cardRateCents: {
    item: 2000,
    hostFee: 100,
    pstOnItem: 100,
    pstOnHostFee: 5,
    showpassFee: 224,
    paymentProcessingFee: 101,
    pstOnServiceFees: 16,
  },
  expectedCardTotalCents: 2546,
} as const;
