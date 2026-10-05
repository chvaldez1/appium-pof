import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

await test('.env.local loads defaults and preserves explicit device overrides', () => {
  const root = mkdtempSync(join(tmpdir(), 'appium-env-test-'));
  try {
    mkdirSync(join(root, 'config'));
    copyFileSync(new URL('../config/local-env.ts', import.meta.url), join(root, 'config/local-env.ts'));
    writeFileSync(join(root, '.env.local'), 'IOS_UDID=local-test-device\n');
    // Use a copied loader with the same relative environment-file layout.
    const script = join(root, 'loader.ts');
    writeFileSync(
      script,
      `import './config/local-env.ts';
process.stdout.write(process.env.IOS_UDID ?? '');`,
    );
    const env = { ...process.env };
    delete env.IOS_UDID;
    const run = (values: NodeJS.ProcessEnv) =>
      spawnSync(process.execPath, [script], { env: values, encoding: 'utf8' });
    const local = run(env);
    assert.equal(local.status, 0);
    assert.equal(local.stdout, 'local-test-device');
    const override = run({ ...env, IOS_UDID: 'explicit-test-device' });
    assert.equal(override.status, 0);
    assert.equal(override.stdout, 'explicit-test-device');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
