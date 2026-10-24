# Appium coding standards

Reviewed October 22, 2026. This guide describes this repository's WebdriverIO 9 / Mocha / Appium 3 conventions. The dependency versions in `package.json` and the installed driver documentation are the version-specific source of truth; upstream documentation can describe newer behavior.

## Start with the test body

The code inside `it()` is the test. The `before()` callback prepares the suite, and `beforeEach()` prepares each case. WebdriverIO owns creation and cleanup of the driver session. Page objects do not create sessions.

For Organizer navigation, the execution path is:

```text
npm run test:organizer:navigation
  → scripts/run-with-playwright-fixtures.ts organizer-navigation
  → loads local settings and private account inputs
  → wdio.conf.ts → config/wdio.ios.conf.ts
  → src/setup/session-hooks.ts
  → tests/native/organizer/ios/organizer-navigation.spec.ts
      before: reach the Organizer dashboard, logging in if needed
      it: open a destination and assert its screen and content
      later beforeEach: restart the app and require the retained session
```

Passing this suite proves dashboard navigation with the available session. It does **not** necessarily prove a fresh login. A login test must explicitly start signed out, submit credentials, and assert authenticated state. The existing `test:login` command only checks that the login form opens.

`REUSE_INSTALLED_APP=1` chooses the already installed binary. `RESET_APP=1` requests driver reset behavior through `noReset=false`. Installation, app-data reset, process restart, and account logout are different operations. Do not treat reset as a universal guarantee that iOS Keychain or server-side authentication has been cleared. Verify the signed-out precondition when that is what the test needs.

## Choose the driver for the surface

Appium is the server, WebdriverIO is the client/runner, and a driver implements platform automation. A WebView context is a mode within a session, not a separate cross-platform native driver.

| Target in this repo | Driver selected here                           | Surface and selector language                                                                      | Current scope                                                                   |
| ------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `ios-app`           | XCUITest                                       | Native iOS accessibility identifiers, iOS predicates/class chains; switch context for embedded DOM | Showpass Beta iOS journeys implemented                                          |
| `ios-webview`       | XCUITest                                       | Native host plus WebKit DOM after context selection                                                | Harness configuration; requires a supplied host app                             |
| `android-app`       | UiAutomator2                                   | Android accessibility descriptions, resource IDs, Android UIAutomator                              | Configuration and generic launch smoke; no Android business journey implemented |
| `android-webview`   | UiAutomator2 with Chromedriver for web content | Native Android plus DOM after context selection                                                    | Harness configuration; requires a supplied host app and compatible Chromedriver |
| `ios-safari`        | XCUITest                                       | Safari DOM on the selected iPhone/simulator                                                        | Browser smoke spec                                                              |
| `desktop-safari`    | Appium Safari driver                           | Safari DOM on macOS                                                                                | Browser smoke spec; Safari automation must be enabled                           |

These are configuration/implementation scopes, not claims that every target passed on a device. The Safari driver also has other upstream capabilities; the table states this repo's actual selection. Espresso, Chromium, Gecko, and other drivers are not configured here. Add one only for a concrete testing need and keep its supported commands, capabilities, and prerequisites explicit.

Standard WebDriver capabilities such as `platformName` and `browserName` have no vendor prefix. Appium capabilities use `appium:`. Share a capability only when both drivers support it and its semantics are understood. For example, both mobile drivers support `enforceAppInstall`, but UiAutomator2 documents that it has no effect with `noReset=true`.

XCUITest needs macOS, Xcode, WebDriverAgent, and a suitable signed app. A simulator `.app` cannot establish physical-device compatibility. UiAutomator2 needs Android tooling, a selected serial, and an appropriate APK. Its WebViews need debugging enabled and a Chromedriver compatible with the embedded Chromium version. Keep any permitted download feature scoped to that driver; this repo currently enables `uiautomator2:chromedriver_autodownload` only for the Android WebView target. For controlled/offline CI, provision the compatible driver rather than relying on an unplanned download.

## Keep each layer small

| Layer                | Put here                                                | Keep elsewhere                                   |
| -------------------- | ------------------------------------------------------- | ------------------------------------------------ |
| Spec                 | Scenario, preconditions, outcome assertions             | Raw selectors and server setup                   |
| Flow                 | Navigation across screens and native/WebView boundaries | Fixed account passwords and UI selectors         |
| Screen/page object   | Lazy getters and user actions                           | Session creation, API calls, environment loading |
| Data                 | Typed fixtures, account parsing, generated guest values | Driver commands                                  |
| API                  | Backend reads with caller-supplied credentials          | UI actions                                       |
| Config/setup/support | Capabilities, waits, lifecycle, contexts, artifacts     | Business outcomes                                |

Use the aliases from `tsconfig.json`. Keep native implementations under their platform directory. Reuse a DOM page object across iOS and Android only when its markup and behavior actually match. A base class full of platform branches makes ownership harder to understand; add focused platform implementations when needed.

## Use lazy, meaningful selectors

Prefer existing stable accessibility identifiers for native controls and stable test IDs or semantic selectors for web content. This is a preference, not a reason to change working selectors without inspecting the real UI. Do not alter frontend behavior just to satisfy a test.

```ts
// iOS page object: evaluated when used, not when this module is imported.
get submit() {
  return $('~Login');
}

// Android example only: use the real resource ID from the inspected Android app.
get submit() {
  return $('id=com.example.app:id/login');
}

// WebView/Safari example: requires the appropriate browser context.
get submit() {
  return $('[data-testid="login-submit"]');
}
```

Do not use iOS `XCUIElementType` locators against Android, or CSS against native controls. Use XPath when a genuine relationship is needed and simpler supported selectors cannot express it. Escape dynamic values; this repo uses `xpathLiteral()` for XPath inputs. Avoid absolute trees, unexplained indexes, and screen coordinates. Do not cache resolved elements across navigation, app restarts, or context changes.

## Wait for observable behavior

WebdriverIO provides auto-waiting for supported element interactions and retrying assertions. Prefer an assertion on an element over an immediate assertion on a boolean captured from it.

```ts
import { expect } from '@wdio/globals';

await organizerDashboardPage.open(destination);
await expect(organizerDashboardPage.screen(destination)).toBeDisplayed();
```

Use `waitUntil` for a compound condition, an app state, or data outside an element matcher. Give it a bounded timeout and a useful failure message. Use `node:assert/strict` for static data, calculations, and API results; an immediate assertion does not retry a changing UI.

A hidden control can still exist in the hierarchy. When the requirement is that the previous screen is no longer visible, wait for displayed state to become false rather than requiring the element to be removed entirely.

Fixed pauses are not readiness checks. Wait for the next screen, enabled control, retained text value, or expected URL. A documented driver/input workaround may need a short delay, but it should have a subsequent state check and a reason. Remaining checkout pauses and full-page-source step checks are improvement candidates: replace them when the relevant controls can be inspected and the journey rerun, rather than inventing unverified selectors. Do not add implicit waits on top of explicit waits.

An optional prompt timeout can act like a fixed delay when the prompt is absent. The named Organizer command now checks for known system prompts during its screen-readiness wait and continues as soon as the screen is ready. It does not shorten assertion timeouts or remove app restarts. See the [measured Organizer timing comparison](../tests/README.md#organizer-navigation-timing--october-22-2026). Other journeys retain their existing startup prompt handling.

## Select WebViews by the page you need

Do not select the first `WEBVIEW_*` context from a single snapshot. Contexts can appear late, detach, contain multiple windows, or belong to unrelated content. Wait within a deadline, inspect live windows, match the expected origin and path, and check the page's readiness. Reacquire elements after switching.

The shared `switchToWebview()` helper accepts the small context/window interface supported by both mobile drivers. It leaves the matching page selected and restores `NATIVE_APP` when discovery fails. Callers that return to native controls must do so explicitly, including on errors:

```ts
import { browser } from '@wdio/globals';
import { switchToWebview } from '@support/contexts/switch-to-webview.ts';

try {
  await switchToWebview(browser, {
    matchesUrl: (url) => url.origin === 'https://beta.showpass.com' && url.pathname === '/account/upcoming/',
    description: 'the Upcoming account page',
  });
  // Use web page objects here and assert the feature's actual content.
} finally {
  await browser.switchContext('NATIVE_APP');
}
```

The helper retries discovery only. It must never retry a purchase, login submission, or other user action. Catching a transient detached context is appropriate within that bounded discovery loop; swallowing a whole test failure is not.

## Make state and data explicit

`process.env` is the normal Node interface for shell/CI settings. It returns strings or `undefined`; it is not a JSON or fixture reader. `.env.local` is loaded once through `config/local-env.ts`, and shell/CI values take precedence. Keep device identifiers and private accounts there or in the CI secret store. Use typed configuration after validating external values. Static Event and address fixtures belong in `src/data/`; generated values should use a small function.

Document each scenario's starting state: signed out, authenticated, empty basket, permissions, app version, driver, and platform/runtime. Test independence means the case establishes the state it requires; it does not necessarily mean reinstalling the application for every `it()`. Never make a test's success depend on an earlier test mutating data unless it is explicitly one cohesive journey.

Restarting an app checks persistence; it does not clear an account. Log or report whether authentication was submitted or a session was reused when claiming login coverage. For CAPTCHA or another environment blocker, record the unmodified build and the operator's test-environment switch state. A frontend bypass makes the result evidence for a different app. Application changes require a separate explicit request.

## Protect evidence and side effects

All app/WebView targets use silent WebdriverIO command logging, filtered managed-Appium logs, and no automatic hook screenshots, including direct `--spec` runs. JUnit and session metadata remain available. The login-form spec no longer saves unconditional account/login screenshots or XML. Explicit diagnostic captures elsewhere can still contain authenticated information; only capture known safe screens and keep artifacts private. External Appium server logs require separate filtering by the operator. Error messages and custom logging must never contain passwords, card details, or tokens.

Keep the Appium service on loopback or a protected network. Do not enable relaxed security globally to fix a driver problem. Use the narrow feature and driver scope actually required.

Run one local device/build/check operation at a time. Keep only the selected simulator booted, run the OS matrix sequentially, and clean up only resources owned by the run. A future parallel implementation needs isolated device/account state, artifact paths, and driver ports (including WebDriverAgent or UiAutomator2/Chromedriver ports as applicable); raising `maxInstances` alone is insufficient.

Purchases use beta test-mode payments, a unique customer email, and one submission. Keep the recovery marker before clicking Pay. Resolve an uncertain result by reading the saved order, charge, line items, and issued ticket. Do not use spec retries to repeat a payment or change frontend code to force success.

## Review findings and changes

| Finding                                                                                           | Disposition in this review                                                                                                 |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Event flow selected the first immediately available WebView and checked a URL prefix once         | Added bounded context/window discovery using exact origin/path matching; event page also waits for its Buy tickets control |
| Account WebView checks did not inspect multiple windows                                           | Use the same discovery helper, preserve page readiness checking, and restore native mode                                   |
| Sensitive logging depended on callers remembering journey flags                                   | Protect all app/WebView targets by default; silence WebdriverIO command output and retain managed-Appium filtering         |
| Login-form spec always saved account/login screenshots and XML                                    | Removed these unconditional captures and added an explicit retrying outcome assertion                                      |
| Android ignored the documented installed-app reuse option                                         | Apply `REUSE_INSTALLED_APP` when resolving the APK path                                                                    |
| Organizer page object owned scenario outcome checks and required the prior tile to cease existing | Spec now asserts destination screen/content with retrying matchers; page object waits for the prior tile to be hidden      |
| Search used fixed delays; checkout total was checked immediately                                  | Removed the search sleeps in favor of existing control/result waits; poll the expected checkout total                      |
| Other checkout sleeps, native XPath relationships, and page-source checks remain                  | Documented improvement work requiring observed controls and device verification; no speculative replacement                |
| Generic Android launch only proves foreground state plus a nonempty hierarchy                     | Retained as setup smoke, not Android feature coverage; add a real screen assertion when that app is available              |

The existing architecture, lazy page objects, typed purchase scenario, explicit device selection, serial runner, default payment exclusion, build verification, and API-based purchase recovery are useful foundations. This is a targeted code review, not an Appium certification or a claim that every driver has been exercised.

## Validation before sharing

Run `npm run check`: lint, formatting, TypeScript, Node unit tests, and device-free spec discovery, sequentially. The context regression tests cover late discovery, wrong origins/paths, multiple windows, detached contexts, and native restoration on timeout. Configuration tests load the real configs without starting sessions and cover direct-run privacy and Android installed-app reuse.

Report static checks separately from simulator/device results. This review does not rerun a simulator, change switches, modify frontend code, or submit payment. Earlier device results belong to the source revision and environment used for those runs; the modified flows need a subsequent authorized E2E run before they are called device-verified.

## Primary references

- [WebdriverIO best practices](https://webdriver.io/docs/bestpractices/) — resilient selectors, lazy elements, retrying assertions, and waits.
- [WebdriverIO auto-waiting](https://webdriver.io/docs/autowait/) and [page objects](https://webdriver.io/docs/pageobjects/).
- [Appium session capabilities](https://appium.io/docs/en/3.2/guides/caps/) and [context management](https://appium.io/docs/en/2.11/guides/context/).
- [XCUITest capabilities](https://github.com/appium/appium-xcuitest-driver/blob/master/docs/reference/capabilities.md) and [hybrid automation](https://github.com/appium/appium-xcuitest-driver/blob/master/docs/guides/hybrid.md).
- [UiAutomator2 driver documentation](https://github.com/appium/appium-uiautomator2-driver) — Android selectors, reset semantics, WebViews, and Chromedriver.
- [Appium Safari driver](https://github.com/appium/appium-safari-driver) — Safari-specific capabilities and host prerequisites.
- [Appium server security](https://appium.io/docs/en/3.2/guides/security/).
