export const target = process.env.TARGET || 'desktop-safari';
export const baseURL = 'https://beta.showpass.com/';
export const appId =
  process.env.APP_ID ||
  (target.endsWith('-webview')
    ? 'com.example.showpasswebview'
    : target === 'ios-app'
      ? 'com.showpass.swift.beta'
      : target === 'android-app'
        ? 'com.showpass.android.beta'
        : '');

// Milliseconds unless the name explicitly says seconds.
export const timeoutMs = {
  apiRead: 15_000,
  uiControl: 10_000,
  uiNavigation: 30_000,
  pageLoad: 60_000,
  customerLogin: 45_000,
  orderFinalization: 90_000,
  webviewDiscovery: 90_000,
  appiumStart: 120_000,
  wdaLaunch: 180_000,
  connectionRetry: 240_000,
  mochaSmoke: 240_000,
  mochaPurchase: 600_000,
  simulatorCommand: 300_000,
  iosMatrixRun: 600_000,
} as const;

export const pauseMs = {
  searchSuggestions: 1_500,
  searchResults: 2_500,
  checkoutTransition: 1_500,
  guestForm: 3_000,
  cardMethod: 2_000,
  discoveryCapture: 1_000,
} as const;

export const pollIntervalMs = { invoice: 2_000, webview: 1_500 } as const;
export const appiumCommandTimeoutSeconds = 180;
export const invoiceSearchLookbackMs = 120_000;
