import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { timeoutMs } from '../test/settings.ts';
import { assertIosAppBuild } from './ios-app-build.ts';
import { parseIosMajors, selectIosRuntimes, type SimulatorRuntime } from './ios-simulator-matrix.ts';

type SimulatorDevice = {
  udid: string;
  name: string;
  state: string;
  isAvailable: boolean;
  deviceTypeIdentifier: string;
};
type SimulatorInventory = Record<string, SimulatorDevice[]>;
type VersionResult = {
  iosMajor: number;
  runtimeVersion?: string;
  simulator?: string;
  status: 'passed' | 'failed' | 'missing-runtime';
  detail?: string;
};

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const resultsPath = resolve(root, 'artifacts/ios-app/versions');
const showSimulator = process.env.SHOW_SIMULATOR !== '0' && process.env.CI !== 'true';

function simctl(...args: string[]): string {
  return execFileSync('xcrun', ['simctl', ...args], {
    encoding: 'utf8',
    timeout: timeoutMs.simulatorCommand,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function runtimeInventory(): SimulatorRuntime[] {
  return (JSON.parse(simctl('list', 'runtimes', '--json')) as { runtimes: SimulatorRuntime[] }).runtimes;
}

function deviceInventory(): SimulatorInventory {
  return (JSON.parse(simctl('list', 'devices', '--json')) as { devices: SimulatorInventory }).devices;
}

function plistValue(plistPath: string, key: string): string {
  return execFileSync('/usr/libexec/PlistBuddy', ['-c', `Print ${key}`, plistPath], {
    encoding: 'utf8',
    timeout: timeoutMs.uiControl,
  }).trim();
}

function appIdentity(appPath: string): { bundleId: string; version: string; build: string } {
  const plist = resolve(appPath, 'Info.plist');
  if (!existsSync(plist)) throw new Error(`Simulator app is missing Info.plist: ${appPath}`);
  return {
    bundleId: plistValue(plist, 'CFBundleIdentifier'),
    version: plistValue(plist, 'CFBundleShortVersionString'),
    build: plistValue(plist, 'CFBundleVersion'),
  };
}

function getInstalledApp(udid: string, bundleId: string): string | undefined {
  try {
    return simctl('get_app_container', udid, bundleId, 'app');
  } catch {
    return undefined;
  }
}

function ensureInstalled(udid: string, appPath: string): void {
  const wanted = appIdentity(appPath);
  const installedPath = getInstalledApp(udid, wanted.bundleId);
  const installed = installedPath ? appIdentity(installedPath) : undefined;
  if (
    process.env.REINSTALL_APP === '1' ||
    !installed ||
    installed.version !== wanted.version ||
    installed.build !== wanted.build
  ) {
    console.log(`Installing Showpass Beta ${wanted.version} (${wanted.build}) on ${udid}.`);
    simctl('install', udid, appPath);
  } else {
    console.log(`Reusing installed Showpass Beta ${wanted.version} (${wanted.build}) on ${udid}.`);
  }
}

function selectOrCreateDevice(runtime: SimulatorRuntime, major: number): SimulatorDevice {
  const name = `Showpass QA iPhone iOS ${major}`;
  const devices = (deviceInventory()[runtime.identifier] ?? []).filter(
    (device) => device.isAvailable && device.deviceTypeIdentifier.includes('.iPhone-'),
  );
  const existing = devices.find((device) => device.name === name) ?? devices[0];
  if (existing) return existing;
  const type = runtime.supportedDeviceTypes.find((candidate) => candidate.productFamily === 'iPhone');
  if (!type) throw new Error(`iOS ${runtime.version} has no supported iPhone Simulator device type.`);
  const udid = simctl('create', name, type.identifier, runtime.identifier);
  console.log(`Created ${name} (${udid}).`);
  return { udid, name, state: 'Shutdown', isAvailable: true, deviceTypeIdentifier: type.identifier };
}

function currentState(udid: string): string {
  return (
    Object.values(deviceInventory())
      .flat()
      .find((device) => device.udid === udid)?.state ?? 'Unknown'
  );
}

function boot(udid: string): void {
  if (currentState(udid) !== 'Booted') simctl('boot', udid);
  simctl('bootstatus', udid, '-b');
  if (showSimulator) {
    try {
      const developerDir = execFileSync('xcode-select', ['-p'], { encoding: 'utf8' }).trim();
      const deviceHub = resolve(developerDir, '../Applications/DeviceHub.app');
      const simulator = resolve(developerDir, 'Applications/Simulator.app');
      const guiApp = existsSync(deviceHub) ? deviceHub : simulator;
      const opened = spawnSync('open', ['-a', guiApp, '--args', '-CurrentDeviceUDID', udid], {
        timeout: timeoutMs.uiControl,
        stdio: 'ignore',
      });
      if (opened.status !== 0) throw new Error('The viewer could not open.');
    } catch {
      console.warn('Simulator window could not be opened; Appium will still run.');
    }
  }
}

function writeSummary(results: VersionResult[]): void {
  mkdirSync(resultsPath, { recursive: true });
  writeFileSync(resolve(resultsPath, 'summary.json'), JSON.stringify(results, null, 2));
  for (const result of results) {
    console.log(
      `iOS ${result.iosMajor}${result.runtimeVersion ? ` (${result.runtimeVersion})` : ''}: ${result.status}${result.detail ? ` — ${result.detail}` : ''}`,
    );
  }
  console.log(`Results: ${resolve(resultsPath, 'summary.json')}`);
}

function main(): void {
  const listOnly = process.argv.includes('--list');
  if (process.argv.some((arg, index) => index > 1 && arg !== '--list')) {
    throw new Error('Only --list is supported. Set IOS_MAJOR_VERSIONS for a diagnostic subset.');
  }
  const majors = parseIosMajors(process.env.IOS_MAJOR_VERSIONS);
  const selected = selectIosRuntimes(runtimeInventory(), majors);
  if (listOnly) {
    for (const { major, runtime } of selected) {
      console.log(`iOS ${major}: ${runtime ? `installed ${runtime.version}` : 'runtime missing'}`);
    }
    return;
  }

  const appPath = resolve(root, process.env.APP_PATH ?? 'apps/Showpass-Beta-Simulator.app');
  if (!existsSync(appPath)) throw new Error(`Set APP_PATH to a beta simulator .app: ${appPath}`);
  const appBuild = appIdentity(appPath);
  assertIosAppBuild(appBuild);
  const { bundleId } = appBuild;
  const devices = selected.map(({ major, runtime }) => ({
    major,
    runtime,
    device: runtime ? selectOrCreateDevice(runtime, major) : undefined,
  }));
  const originallyBooted = new Set(
    devices
      .filter(({ device }) => device && currentState(device.udid) === 'Booted')
      .map(({ device }) => device!.udid),
  );
  const results: VersionResult[] = [];
  try {
    for (const { major, runtime, device } of devices) {
      if (!runtime || !device) {
        results.push({
          iosMajor: major,
          status: 'missing-runtime',
          detail: 'Install this iOS Simulator runtime in Xcode.',
        });
        continue;
      }
      console.log(`\nLaunching Showpass Beta on iOS ${runtime.version} (${device.name}).`);
      try {
        for (const other of devices) {
          if (
            other.device &&
            other.device.udid !== device.udid &&
            currentState(other.device.udid) === 'Booted'
          ) {
            simctl('shutdown', other.device.udid);
          }
        }
        boot(device.udid);
        ensureInstalled(device.udid, appPath);
        const artifactDir = resolve(resultsPath, `ios-${major}`);
        const run = spawnSync(
          resolve(root, 'node_modules/.bin/wdio'),
          ['run', './wdio.conf.ts', '--spec', './test/specs/app.smoke.ts'],
          {
            cwd: root,
            stdio: 'inherit',
            timeout: timeoutMs.iosMatrixRun,
            env: {
              ...process.env,
              TARGET: 'ios-app',
              IOS_UDID: device.udid,
              APP_ID: bundleId,
              REUSE_INSTALLED_APP: '1',
              RESET_APP: '0',
              APPIUM_ARTIFACT_DIR: artifactDir,
            },
          },
        );
        if (run.error) throw run.error;
        results.push({
          iosMajor: major,
          runtimeVersion: runtime.version,
          simulator: device.udid,
          status: run.status === 0 ? 'passed' : 'failed',
          ...(run.status === 0 ? {} : { detail: `Appium exited ${run.status ?? 'without a status'}.` }),
        });
      } catch (error) {
        results.push({
          iosMajor: major,
          runtimeVersion: runtime.version,
          simulator: device.udid,
          status: 'failed',
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } finally {
    for (const { device } of devices) {
      if (device && !originallyBooted.has(device.udid) && currentState(device.udid) === 'Booted') {
        simctl('shutdown', device.udid);
      }
    }
    for (const udid of originallyBooted) boot(udid);
    writeSummary(results);
  }
  if (results.some((result) => result.status !== 'passed')) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
