import assert from 'node:assert/strict';

// A fresh address identifies one run without creating or storing another account.
export function createGuestEmail(customerEmail: string, runTag: string): string {
  const [localPart, domain] = customerEmail.split('@');
  assert.ok(localPart && domain && !domain.includes('@'), 'The guest email base must be valid.');
  assert.match(runTag, /^appium-\d+$/, 'Use an appium-<timestamp> run tag.');
  return `${localPart.split('+')[0]}+${runTag}@${domain}`;
}
