import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { timeoutMs } from '../test/settings.ts';

if (process.env.GITHUB_ACTIONS !== 'true' || !process.env.GITHUB_ENV) {
  throw new Error('This script only creates a simulator on a GitHub Actions runner.');
}
type SimulatorRuntime = {
  isAvailable: boolean;
  identifier: string;
  version: string;
};
type SimulatorDeviceType = { name: string; identifier: string };
const simctl = (...args: string[]): string =>
  execFileSync('xcrun', ['simctl', ...args], {
    encoding: 'utf8',
    timeout: timeoutMs.simulatorCommand,
  });
const runtimes = (JSON.parse(simctl('list', 'runtimes', '--json')).runtimes as SimulatorRuntime[])
  .filter((runtime) => runtime.isAvailable && runtime.identifier.includes('.iOS-'))
  .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
const runtime = runtimes[0];
if (!runtime) throw new Error('No available iOS simulator runtime; inspect the selected Xcode.');
const types = JSON.parse(simctl('list', 'devicetypes', '--json')).devicetypes as SimulatorDeviceType[];
const device = types.find((type) => type.name.startsWith('iPhone '));
if (!device) throw new Error('No iPhone simulator device type; inspect the selected Xcode.');
const udid = simctl('create', 'Appium PoF CI iPhone', device.identifier, runtime.identifier).trim();
appendFileSync(process.env.GITHUB_ENV, `IOS_UDID=${udid}\n`);
console.log(`Created ${device.name} on iOS ${runtime.version}: ${udid}`);
simctl('boot', udid);
simctl('bootstatus', udid, '-b');
