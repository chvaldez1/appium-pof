import { target } from '@config/test-settings.ts';
import { createSharedConfig } from '@config/wdio.shared.conf.ts';
import { createAndroidCapabilities } from '@config/capabilities/android.capabilities.ts';

if (target !== 'android-app' && target !== 'android-webview') {
  throw new Error('Use TARGET=android-app or TARGET=android-webview with wdio.android.conf.ts.');
}

export const config = createSharedConfig(createAndroidCapabilities(), 'uiautomator2');
