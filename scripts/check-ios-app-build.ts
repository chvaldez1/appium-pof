import { resolve } from 'node:path';
import { verifyIosAppBuild } from '@config/ios-app-build.ts';

const udid = process.env.IOS_UDID;
if (!udid) throw new Error('Set IOS_UDID to the connected iPhone or simulator identifier.');
const appPath = process.env.APP_PATH ? resolve(process.env.APP_PATH) : undefined;
const build = verifyIosAppBuild({
  udid,
  appPath: process.argv.includes('--installed') ? undefined : appPath,
});
console.log(`Showpass Beta ${build.version} (${build.build}) matches config/app-build.json.`);
