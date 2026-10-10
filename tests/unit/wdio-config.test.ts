import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { projectRoot } from '@config/project-paths.ts';
import { e2eSpecs } from '@config/specs.ts';

// Parse real configs in separate processes; initialize no Appium session or hooks.
const inspectConfig = `
import { ConfigParser } from '@wdio/config/node';
import { fileURLToPath } from 'node:url';
const parser = new ConfigParser(process.env.CONFIG_UNDER_TEST);
await parser.initialize();
const config = parser.getConfig();
const capabilities = parser.getCapabilities();
const specs = parser.getSpecs().flat().map(fileURLToPath);
parser.getConfig().specs = [process.env.UNIT_SPEC_UNDER_TEST];
const unitSpecs = parser.getSpecs();
process.stdout.write(JSON.stringify({
  specs, unitSpecs, capabilities,
  rootDir: config.rootDir, tsConfigPath: config.tsConfigPath,
  maxInstances: config.maxInstances, connectionRetryCount: config.connectionRetryCount,
  logLevel: config.logLevel, mochaTimeout: config.mochaOpts.timeout,
  serverArgs: config.services[0][1].args,
}));`;

void test('root and platform configs preserve discovery, capabilities, and sensitive-run settings', () => {
  const temporary = mkdtempSync(resolve(tmpdir(), 'appium-config-test-'));
  try {
    const app = resolve(temporary, 'harness.app');
    const apk = resolve(temporary, 'harness.apk');
    mkdirSync(app);
    writeFileSync(apk, '');
    const cases = [
      { file: 'wdio.conf.ts', target: 'desktop-safari', app, driver: 'Safari', spec: e2eSpecs.safariSmoke },
      {
        file: 'config/wdio.safari.conf.ts',
        target: 'ios-safari',
        app,
        driver: 'XCUITest',
        spec: e2eSpecs.safariSmoke,
      },
      {
        file: 'config/wdio.ios.conf.ts',
        target: 'ios-webview',
        app,
        driver: 'XCUITest',
        spec: e2eSpecs.webviewSmoke,
      },
      {
        file: 'config/wdio.android.conf.ts',
        target: 'android-webview',
        app: apk,
        driver: 'UiAutomator2',
        spec: e2eSpecs.webviewSmoke,
      },
      {
        file: 'wdio.conf.ts',
        target: 'android-app',
        app: apk,
        driver: 'UiAutomator2',
        spec: e2eSpecs.appSmoke,
      },
    ];
    for (const scenario of cases) {
      // The Ubuntu quality job checks Android configs; Apple configs require macOS.
      if (!scenario.target.startsWith('android-') && process.platform !== 'darwin') continue;
      const child = spawnSync(
        process.execPath,
        ['--import', 'tsx', '--input-type=module', '-e', inspectConfig],
        {
          cwd: projectRoot,
          encoding: 'utf8',
          env: {
            ...process.env,
            TARGET: scenario.target,
            CONFIG_UNDER_TEST: resolve(projectRoot, scenario.file),
            UNIT_SPEC_UNDER_TEST: resolve(projectRoot, 'tests/unit/guest.test.ts'),
            APPIUM_ARTIFACT_DIR: temporary,
            APPIUM_SESSION_ARTIFACT_DIR: temporary,
            APPIUM_SERVER: 'managed',
            APP_PATH: scenario.app,
            APP_ID: 'test.harness',
            IOS_UDID: 'test-ios-device',
            ANDROID_SERIAL: 'test-android-device',
            RESET_APP: '1',
            REUSE_INSTALLED_APP: '0',
            PURCHASE_RUN: '1',
            ORGANIZER_NAVIGATION_RUN: '0',
            BUYER_NAVIGATION_RUN: '0',
          },
        },
      );
      assert.equal(child.status, 0, `${scenario.file}: ${child.stderr}`);
      const result = JSON.parse(child.stdout.slice(child.stdout.indexOf('{')));
      // The script mutates specs only after initialization to exercise the unit exclusion.
      assert.deepEqual(result.specs, [scenario.spec]);
      assert.deepEqual(result.unitSpecs, []);
      assert.equal(result.rootDir, projectRoot);
      assert.equal(result.tsConfigPath, resolve(projectRoot, 'tsconfig.json'));
      assert.equal(result.capabilities[0]['appium:automationName'], scenario.driver);
      assert.equal(result.maxInstances, 1);
      assert.equal(result.connectionRetryCount, 0);
      assert.equal(result.logLevel, 'error');
      assert.equal(result.mochaTimeout, 600_000);
      assert.equal(result.serverArgs.config, './config/appium-sensitive.json');
      if (scenario.target.endsWith('-webview')) {
        assert.equal(result.capabilities[0]['appium:noReset'], false);
        assert.equal(result.capabilities[0]['appium:autoWebview'], false);
      }
      if (scenario.target === 'android-webview') {
        assert.equal(result.serverArgs.allowInsecure, 'uiautomator2:chromedriver_autodownload');
      }
    }
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});
