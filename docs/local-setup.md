# Local setup

Follow the [first iPhone run](../README.md#first-iphone-run) and [simulator build guide](../apps/README.md) for installation and the signing recipe. The architecture migration does not rebuild, replace, or remove app bundles.

## Prerequisites and local settings

Use the Node version in `.node-version`/`.nvmrc`, locked npm dependencies, Xcode, an installed iPhone runtime, and Appium's XCUITest driver. Set the selected `IOS_UDID` in ignored `.env.local` using `.env.example` as the template. Shell and CI values take precedence. `APP_PATH`, `REUSE_INSTALLED_APP`, and `RESET_APP` retain their existing behavior.

Run one operation at a time. Keep only the selected simulator booted, and inspect existing work after an interruption. Do not terminate unrelated processes.

## Validate without a device

```sh
npm run check
```

This runs lint, formatting, TypeScript, unit tests, and WebdriverIO spec discovery sequentially. It does not start Appium or contact the purchase backend. To inspect only discovery:

```sh
npm run test:discovery
```

## Run a smoke test

```sh
npm run app:check -- --installed
npm run test:launch
```

The installed-app check may boot the selected simulator. The launch test verifies Explore without logging in or purchasing. Appium starts and stops automatically. See the [test catalog](../tests/README.md) for the other existing commands and their verification status.

The root runner remains supported. Platform configs can also be selected explicitly:

```sh
REUSE_INSTALLED_APP=1 TARGET=ios-app npx wdio run ./config/wdio.ios.conf.ts
TARGET=ios-safari npx wdio run ./config/wdio.safari.conf.ts
TARGET=desktop-safari npm test
```

Desktop Safari requires macOS remote automation to be enabled. iPhone Safari requires `IOS_UDID`. Existing Android targets require `ANDROID_SERIAL`, an `.apk` in `APP_PATH`, and the UiAutomator2 driver; no Android execution has been verified in this repository. The standalone WebView targets require a separate inspectable harness build.

## Account bridge and purchase recovery

`scripts/run-with-playwright-fixtures.ts` deliberately reads literal QA account values from a local `showpass-playwright` checkout without importing its modules or using Playwright Test. Set `PLAYWRIGHT_REPO_PATH` if that checkout is elsewhere. Alternatively, supply the existing private Organizer and guest environment values described in the [test catalog](../tests/README.md#accounts-and-purchase-results).

Use `npm run test:public:dry-run` to prepare checkout without paying. `npm run test:public` submits one beta test-card payment. Both commands configure fresh state and sensitive logging before starting WebdriverIO.

If a payment outcome is uncertain, use the exact printed run tag:

```sh
npm run recover:public -- appium-<timestamp>
```

Recovery reads the saved order and issued ticket; it does not click Pay. Existing `artifacts/ios-app/purchase/` files and app bundles remain ignored by Git. `apps/README.md` and the non-secret `config/appium-sensitive.json` stay tracked.
