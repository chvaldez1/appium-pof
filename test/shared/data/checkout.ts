// Approved beta inputs shared by purchase scenarios; credentials stay outside this repo.
export const stripeVisaAccepted = {
  nameOnCard: 'QA Team',
  number: '4242424242424242',
  expiry: '05/35',
  cvc: '123',
} as const;

export const calgaryBillingAddress = {
  street: '8500 Macleod Trl',
  unit: 'Unit 350N Floor 3',
  city: 'Calgary',
  country: 'Canada',
  province: 'Alberta',
  postal: 'T2H 2N1',
} as const;
