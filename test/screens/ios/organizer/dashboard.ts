import assert from 'node:assert/strict';
import { $, browser } from '@wdio/globals';
import { timeoutMs } from '../../../settings.ts';

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

export const dashboardPrompt = 'What would you like to do?';

export async function openOrganizerDestination(destination: (typeof organizerDestinations)[number]) {
  const tile = await $(`~${destination.tile}`);
  for (let attempt = 0; attempt < 5 && !(await tile.isDisplayed()); attempt += 1) {
    await browser.execute('mobile: scroll', { direction: 'down' });
  }
  assert.ok(await tile.isDisplayed(), `${destination.tile} is absent or inaccessible on the dashboard.`);
  const neighbor = await $(`~${destination.neighbor}`);
  await neighbor.waitForDisplayed({ timeout: timeoutMs.uiControl });
  await tile.click();

  await neighbor.waitForExist({ reverse: true, timeout: timeoutMs.uiNavigation });
  await $(`~${destination.screen}`).waitForDisplayed({ timeout: timeoutMs.uiNavigation });
  if (destination.content) {
    await $(`~${destination.content}`).waitForDisplayed({ timeout: timeoutMs.pageLoad });
  }
}
