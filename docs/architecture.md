# Framework architecture

This is a WebdriverIO + Mocha + Appium framework. Its organization follows the separation of specifications, journeys, page objects, backend clients, data, and infrastructure familiar from Playwright projects. Playwright Test is not the mobile runner.

```text
appium-pof/
├── .github/workflows/appium.yml
├── apps/README.md
├── config/
│   ├── capabilities/
│   │   ├── app.ts
│   │   ├── ios.capabilities.ts
│   │   └── android.capabilities.ts
│   ├── app-build.json
│   ├── appium-sensitive.json
│   ├── ios-app-build.ts
│   ├── local-env.ts
│   ├── project-paths.ts
│   ├── purchase-settings.ts
│   ├── specs.ts
│   ├── test-settings.ts
│   ├── wdio.shared.conf.ts
│   ├── wdio.ios.conf.ts
│   ├── wdio.android.conf.ts
│   └── wdio.safari.conf.ts
├── tests/
│   ├── native/
│   │   ├── app-smoke.spec.ts
│   │   ├── auth/ios/login-screen.spec.ts
│   │   └── organizer/ios/organizer-navigation.spec.ts
│   ├── hybrid/
│   │   ├── buyer/ios/buyer-navigation.spec.ts
│   │   ├── checkout/ios/
│   │   │   ├── explore-discovery.spec.ts
│   │   │   └── public-purchase.spec.ts
│   │   └── events/webview-smoke.spec.ts
│   ├── mobile-web/safari/safari-smoke.spec.ts
│   └── unit/
├── src/
│   ├── screens/
│   │   ├── native/ios/{auth,buyer,organizer}/
│   │   ├── native/ios/main-menu.ts
│   │   └── webviews/buyer/
│   ├── flows/
│   │   ├── buyer/ios/
│   │   ├── organizer/ios/
│   │   └── purchase/verify-purchase.ts
│   ├── api/purchase-invoices.ts
│   ├── data/
│   │   ├── static/
│   │   ├── factories/guest.ts
│   │   ├── account-source.ts
│   │   └── purchase-scenario.ts
│   ├── support/{artifacts,assertions,contexts,devices,input,permissions,selectors}/
│   └── setup/session-hooks.ts
├── scripts/
├── docs/
├── artifacts/                         # ignored run output
├── .env.example
├── AGENTS.md
├── package.json
├── tsconfig.json
└── wdio.conf.ts                       # compatibility entry point
```

Braces in the tree abbreviate existing sibling directories. There are no empty Android screen, component, external-browser, staging-environment, or asset directories. The Android config preserves the already-existing UiAutomator2 capabilities; Android has not been proved on a device here. The Safari spec serves both desktop Safari and iPhone Safari.

## Ownership

| Layer                 | Responsibility                                                                                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/`              | Describe business behavior and assert scenario outcomes. Native tests exercise native controls; hybrid tests cross native and embedded web contexts.              |
| `src/flows/`          | Coordinate screens into journeys. Existing native navigation is explicitly iOS-specific. The checkout flow stays cohesive across native and WebView interactions. |
| `src/screens/`        | Own lazy locators and user actions. Native iOS and web selectors have separate implementations.                                                                   |
| `src/api/`            | Read invoices, invoice items, and issued tickets with caller-supplied credentials. No UI or fixed Event fixture is imported.                                      |
| `src/flows/purchase/` | Apply a supplied scenario to invoice/item/ticket assertions and bounded API polling. Both the E2E spec and recovery launcher use these checks.                    |
| `src/data/`           | Hold fixed inputs, typed purchase scenarios, account parsing, and the small per-run email generator.                                                              |
| `src/support/`        | Handle low-level contexts, native input, permissions, selectors, simulator runtime selection, and local purchase recovery artifacts.                              |
| `src/setup/`          | Verify the running app, dismiss optional prompts, save session metadata, and apply the screenshot policy.                                                         |
| `config/`             | Select targets, capabilities, timeouts, app builds, runtime inputs, and registered specs.                                                                         |
| `scripts/`            | Executable local/CI orchestration: simulator setup, version matrix, app installation, discovery checks, and the Playwright-fixture bridge.                        |

Screen and flow modules remain small; there is no generic base page, factory class, or injection container. Additional platform implementations should be added only when a real journey requires them. Credentials are runtime inputs and do not belong in screens or committed fixtures.

## Runner selection and discovery

Root `wdio.conf.ts` dispatches by the existing `TARGET` value. Safari targets use `config/wdio.safari.conf.ts`; app and harness targets use their platform config. Each platform config builds capabilities and uses `createSharedConfig()` for Appium startup, reporters, timeouts, serial execution, and lifecycle hooks.

`config/specs.ts` registers every E2E file by absolute path. This avoids changing discovery when the config file moves from the root into `config/`. Each target retains one default smoke spec. Named npm commands, the fixture launcher, and the version runner select individual journeys explicitly. `tests/unit/**` is excluded from WebdriverIO; default discovery never runs a payment.

`npm run test:discovery` uses WebdriverIO's installed config parser to compare the registry with the actual `.spec.ts` inventory and check all six default targets. It does not load app capabilities, boot a simulator, or start Appium. `npm run check` includes this check.

## Infrastructure preserved

- Existing app IDs, reset/reuse flags, build checks, timeouts, WebView options, external-Appium support, and Android harness options remain available.
- `config/local-env.ts` still loads the ignored root `.env.local`, preserving shell and CI overrides. One beta endpoint remains in `config/test-settings.ts`; no speculative staging configuration was added.
- `PURCHASE_RUN`, `ORGANIZER_NAVIGATION_RUN`, and `BUYER_NAVIGATION_RUN` retain sensitive logging and screenshot behavior. The purchase launcher sets these before WebdriverIO starts. An external Appium server remains the caller's responsibility.
- JUnit, session metadata, screenshots, and payment recovery files retain their artifact paths. Recovery reads legacy markers as before and never submits payment.
- The version matrix remains sequential. Simulator signing and the build recipe in `apps/README.md` are unchanged.

See [testing conventions](testing-conventions.md), [local setup](local-setup.md), and the [migration report](refactor-report.md).
