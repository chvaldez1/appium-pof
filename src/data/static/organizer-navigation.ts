export const organizerDestinations = [
  { tile: 'Check in', neighbor: 'Point of sale', screen: 'Select items', content: 'Events' },
  { tile: 'Point of sale', neighbor: 'Check in', screen: 'Point of sale', content: 'Tickets' },
  { tile: 'Manage events', neighbor: 'Event stats', screen: 'Manage events', content: 'Upcoming events' },
  { tile: 'Event stats', neighbor: 'Manage events', screen: 'Event stats', content: 'Upcoming events' },
  { tile: 'Employees', neighbor: 'My stats', screen: 'Manage employees', content: 'All Roles' },
  { tile: 'My stats', neighbor: 'Employees', screen: 'My stats', content: 'Total revenue' },
  { tile: 'Guestlist', neighbor: 'Product stats', screen: 'Stats', content: 'Guestlist' },
  { tile: 'Product stats', neighbor: 'Guestlist', screen: 'Product stats', content: undefined },
] as const;

export type OrganizerDestination = (typeof organizerDestinations)[number];
