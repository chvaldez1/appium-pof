import { target } from '@config/test-settings.ts';

// Compatibility entry point for npm commands and existing local/CI callers.
const platform =
  target === 'desktop-safari' || target === 'ios-safari'
    ? await import('@config/wdio.safari.conf.ts')
    : target.startsWith('android-')
      ? await import('@config/wdio.android.conf.ts')
      : await import('@config/wdio.ios.conf.ts');

export const config = platform.config;
