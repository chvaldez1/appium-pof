import '@config/local-env.ts';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const action = process.argv[2];
if (action !== 'open' && action !== 'install') throw new Error('Choose open or install.');
const udid = process.env.IOS_UDID;
if (!udid) throw new Error('Set IOS_UDID in .env.local.');
const inventory = JSON.parse(
  execFileSync('xcrun', ['simctl', 'list', 'devices', '--json'], {
    encoding: 'utf8',
  }),
) as { devices: Record<string, { udid: string; name: string; state: string; isAvailable: boolean }[]> };
const device = Object.values(inventory.devices)
  .flat()
  .find((item) => item.udid === udid);
if (!device?.isAvailable)
  throw new Error('Select an available simulator in .env.local for app:open/app:install.');
console.log(`${action === 'install' ? 'Installing on' : 'Opening'} ${device.name} (${udid}).`);
if (device.state !== 'Booted') execFileSync('xcrun', ['simctl', 'boot', udid]);
execFileSync('xcrun', ['simctl', 'bootstatus', udid, '-b'], { stdio: 'inherit' });
if (action === 'install') {
  execFileSync(
    'xcrun',
    ['simctl', 'install', udid, resolve(process.env.APP_PATH ?? 'apps/Showpass-Beta-Simulator.app')],
    { stdio: 'inherit' },
  );
}
execFileSync('sh', ['scripts/open-ios-viewer.sh', udid], { stdio: 'inherit' });
execFileSync('xcrun', ['simctl', 'launch', udid, 'com.showpass.swift.beta'], { stdio: 'inherit' });
