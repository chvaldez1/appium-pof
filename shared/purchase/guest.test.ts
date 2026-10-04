import assert from 'node:assert/strict';
import test from 'node:test';
import { createGuestEmail } from '@shared/purchase/guest.ts';

void test('creates a recoverable guest email from a base address', () => {
  assert.equal(createGuestEmail('qa+existing@example.test', 'appium-123'), 'qa+appium-123@example.test');
  assert.throws(() => createGuestEmail('qa@example.test', 'other-run'), /appium-<timestamp>/);
});
