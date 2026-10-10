import { target } from '@config/test-settings.ts';
import { createSharedConfig } from '@config/wdio.shared.conf.ts';
import { createIosCapabilities } from '@config/capabilities/ios.capabilities.ts';

if (target !== 'ios-app' && target !== 'ios-webview') {
  throw new Error('Use TARGET=ios-app or TARGET=ios-webview with wdio.ios.conf.ts.');
}

export const config = createSharedConfig(createIosCapabilities(), 'xcuitest');
