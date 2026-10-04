import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface PurchaseRunMarker {
  runTag: string;
  email: string;
  startedAt: string;
}

export const purchaseArtifactRoot = resolve(
  process.env.APPIUM_ARTIFACT_DIR ?? 'artifacts/ios-app',
  'purchase',
);
const runTagPattern = /^appium-\d+$/;

export function purchaseRunDirectory(runTag: string, root = purchaseArtifactRoot): string {
  assert.match(runTag, runTagPattern, 'Use an appium-<timestamp> purchase run tag.');
  return resolve(root, 'runs', runTag);
}

export function currentPurchaseRunDirectory(): string {
  return process.env.PUBLIC_RUN_TAG ? purchaseRunDirectory(process.env.PUBLIC_RUN_TAG) : purchaseArtifactRoot;
}

export function readPurchaseRunMarker(
  runTag: string,
  root = purchaseArtifactRoot,
): PurchaseRunMarker | undefined {
  const currentPath = resolve(purchaseRunDirectory(runTag, root), 'run.json');
  const legacyPath = resolve(root, 'run.json');
  const current = existsSync(currentPath);
  const path = current ? currentPath : legacyPath;
  if (!existsSync(path)) return undefined;
  const marker = JSON.parse(readFileSync(path, 'utf8')) as Partial<PurchaseRunMarker>;
  if (current) {
    assert.equal(marker.runTag, runTag, 'The saved purchase run tag does not match its folder.');
  } else if (!marker.email?.includes(runTag)) {
    return undefined;
  }
  assert.ok(marker.email, 'The saved purchase run has no guest email.');
  assert.ok(
    marker.startedAt && !Number.isNaN(Date.parse(marker.startedAt)),
    'The saved purchase run has no valid start time.',
  );
  return { runTag, email: marker.email, startedAt: marker.startedAt };
}
