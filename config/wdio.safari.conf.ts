import { target } from '@config/test-settings.ts';
import { createSharedConfig } from '@config/wdio.shared.conf.ts';
import { createIosCapabilities } from '@config/capabilities/ios.capabilities.ts';

if (target !== 'desktop-safari' && target !== 'ios-safari') {
  throw new Error('Use TARGET=desktop-safari or TARGET=ios-safari with wdio.safari.conf.ts.');
}

export const config = createSharedConfig(
  target === 'ios-safari'
    ? createIosCapabilities()
    : { platformName: 'mac', browserName: 'Safari', 'appium:automationName': 'Safari' },
  target === 'ios-safari' ? 'xcuitest' : 'safari',
);
