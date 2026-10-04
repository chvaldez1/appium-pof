export const buyerTabs = [
  { tab: 'Explore', proof: 'Search location or event' },
  { tab: 'Saved', proof: 'Saved events' },
  { tab: 'Upcoming', proof: 'Upcoming' },
  { tab: 'Orders', proof: 'Universal QR Code' },
  { tab: 'Account', proof: 'Personal info' },
] as const;

export type BuyerTab = (typeof buyerTabs)[number]['tab'];

export const orderDestinations = [
  { title: 'My orders', path: '/account/my-orders/' },
  { title: 'Waitlists', path: '/account/waitlists/' },
  { title: 'Memberships', path: '/account/memberships/' },
  { title: 'Products', path: '/account/products/' },
] as const;
