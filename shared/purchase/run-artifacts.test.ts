import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { purchaseRunDirectory, readPurchaseRunMarker } from '@shared/purchase/run-artifacts.ts';

void test('keeps payment recovery markers separate across runs and reads the older marker shape', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'appium-purchase-runs-'));
  try {
    const first = { runTag: 'appium-101', email: 'qa+first@example.test', startedAt: '2026-10-04T10:00:00Z' };
    const second = {
      runTag: 'appium-102',
      email: 'qa+second@example.test',
      startedAt: '2026-10-04T10:01:00Z',
    };
    for (const marker of [first, second]) {
      const path = purchaseRunDirectory(marker.runTag, root);
      mkdirSync(path, { recursive: true });
      writeFileSync(resolve(path, 'run.json'), JSON.stringify(marker));
    }
    assert.deepEqual(readPurchaseRunMarker(first.runTag, root), first);
    assert.deepEqual(readPurchaseRunMarker(second.runTag, root), second);
    assert.equal(readPurchaseRunMarker('appium-103', root), undefined);

    writeFileSync(
      resolve(root, 'run.json'),
      JSON.stringify({ email: 'qa+appium-100@example.test', startedAt: '2026-10-04T09:00:00Z' }),
    );
    assert.deepEqual(readPurchaseRunMarker('appium-100', root), {
      runTag: 'appium-100',
      email: 'qa+appium-100@example.test',
      startedAt: '2026-10-04T09:00:00Z',
    });
    assert.throws(() => purchaseRunDirectory('../outside', root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
