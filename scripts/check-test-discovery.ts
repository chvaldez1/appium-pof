import assert from 'node:assert/strict';
import { globSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ConfigParser } from '@wdio/config/node';
import { e2eSpecs, defaultSpecForTarget } from '@config/specs.ts';
import { projectRoot } from '@config/project-paths.ts';

// Uses the parser already installed with WebdriverIO; starts no server or device.
const registered = Object.values(e2eSpecs);
const discover = (paths: string[]) =>
  ConfigParser.getFilePaths(paths, projectRoot)
    .flat()
    .map((path) => fileURLToPath(path));
const discovered = discover(registered);
const inventory = globSync('tests/**/*.spec.ts', { cwd: projectRoot }).map((path) =>
  resolve(projectRoot, path),
);
assert.deepEqual([...discovered].sort(), inventory.sort(), 'Every E2E spec must be registered exactly once.');
assert.equal(new Set(discovered).size, registered.length, 'The spec registry contains duplicates.');
assert.ok(discovered.every((path) => !path.includes('/tests/unit/')));

for (const target of [
  'desktop-safari',
  'ios-safari',
  'ios-app',
  'android-app',
  'ios-webview',
  'android-webview',
]) {
  const specs = discover([defaultSpecForTarget(target)]);
  assert.equal(specs.length, 1, `${target} must retain one default smoke spec.`);
  assert.notEqual(specs[0], e2eSpecs.publicPurchase, 'Default discovery must not submit a payment.');
  console.log(`${target}: ${specs[0].slice(projectRoot.length)}`);
}
console.log(`WebdriverIO discovered all ${discovered.length} E2E specs; unit tests are separate.`);
