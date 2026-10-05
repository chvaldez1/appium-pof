# Choose a test

Complete the [first iPhone run](../README.md#first-iphone-run) once. Choose `IOS_UDID` in the ignored `.env.local` file, then run these commands from the Appium repository root. Appium starts and stops automatically; the terminal prints the selected test title and its final pass/fail result. Shell/CI values override local settings.

**Run a named command, not a file under `screens/`.** For example, `screens/ios/auth/login.ts` is the reusable login page object. `npm run test:login` runs the spec that opens that screen and checks for its email field.

| What to check             | Command                                                   | Effect                                                                                                     |
| ------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| iPhone app launches       | `npm run test:launch`                                     | Read-only; checks Explore. Start here.                                                                     |
| Login screen opens        | `npm run test:login`                                      | Read-only; checks Account → Login. Tested simulator builds have exited here.                               |
| Guest checkout before Pay | `REUSE_INSTALLED_APP=1 npm run test:public:dry-run`       | Fills one Adult ticket checkout; does not submit payment.                                                  |
| Guest purchase and order  | `REUSE_INSTALLED_APP=1 npm run test:public`               | Submits one beta test-card payment and verifies the order and ticket. Creates a test order.                |
| Organizer screens         | `REUSE_INSTALLED_APP=1 npm run test:organizer:navigation` | Checks eight destinations after employee login; currently blocked at Login on tested builds.               |
| Three iOS versions        | `npm run test:ios:versions`                               | Launches on iOS 27, 26, and 18; no login or purchase. Run `npm run test:ios:versions -- --list` first.     |
| Desktop Safari            | `TARGET=desktop-safari npm test`                          | Checks the beta page loads. Install the Safari Appium driver once with `npx appium driver install safari`. |
| iPhone Safari             | `TARGET=ios-safari npm test`                              | Checks the beta page loads in iPhone Safari.                                                               |

`test:box-office:entry` is an older name for the same login-screen check as `test:login`; it does not buy a ticket. The iOS version runner uses `apps/Showpass-Beta-Simulator.app` unless you set `APP_PATH` to another `.app`. It may install that build on each simulator and does not uninstall it afterward. Use a current-source build for iOS 27; older bundles may lack the required scene configuration.

To run a spec without an npm alias, pass its path to WebdriverIO. For example, this is the same launch check as `npm run test:launch`:

```sh
REUSE_INSTALLED_APP=1 TARGET=ios-app npm test -- --spec ./tests/app.smoke.ts
```

## Accounts and purchase results

Public purchase commands use fresh local app state (`RESET_APP=1` by default) so an earlier basket cannot add another ticket. They reuse the installed build; no source rebuild is required. For the optional discovery diagnostic, use `RESET_APP=1 TARGET=ios-app PUBLIC_CHECKOUT_MODE=guest npm test -- --spec ./tests/ios/explore.discovery.ts` to open the guest form without entering personal information or paying.

`npm run test:webview` opens Comic Con in the installed iPhone app, checks its embedded beta page, and returns to native controls. It reuses the public purchase flow and does not submit payment. The standalone `ios-webview` and `android-webview` targets require a separate harness app; no harness build is included in this repository.

The public checkout and Organizer commands read QA accounts from a local [showpass-playwright](https://github.com/showpass/showpass-playwright) checkout. If it is outside the standard Showpass repos folder, set `PLAYWRIGHT_REPO_PATH` to its absolute path. You can instead supply the Organizer account through private `SHOWPASS_ORGANIZER_EMAIL` and `SHOWPASS_ORGANIZER_PASSWORD` environment values. Public checkout also needs `PUBLIC_GUEST_EMAIL_BASE`, `PUBLIC_GUEST_NAME`, and `PUBLIC_GUEST_PHONE` when not using the Playwright fixture. Each public run checks out as a guest with a fresh email.

The purchase runner prints an `appium-<timestamp>` tag and saves results under `artifacts/ios-app/purchase/runs/<run-tag>/`. If the payment outcome is uncertain, do **not** submit another purchase. Run `npm run recover:public -- <run-tag>` to read the saved order and ticket; recovery never clicks Pay. Other JUnit results live under `artifacts/<target>/junit/`.

After `Invoice read preflight passed`, Appium starts its server and iPhone automation session before the app begins moving. Watch the device selected by `IOS_UDID`; opening a different simulator window does not change the test's device. Purchase server logs redact command details while retaining the startup message needed to start the test.

## Latest verification — October 4, 2026

- **Guest purchase, iOS 18.6:** The fresh 3.7.2 (180) build passed preparation through the payment form, including a final rerun after the input and simulator-preflight fixes. One Adult order was completed for $25.46 with card ending 4242. Backend recovery verified one order, its charge ID, `psp_mobile`, the Adult item, and its issued ticket. The original full run failed an incorrect `psp_web` expectation; the expectation now matches backend `PLATFORM_MOBILE` and frontend `getPublicPurchasePlatform()`. Recovery did not submit another payment and did not separately re-prove UI confirmation. The full spec was not resubmitted after this correction.
- **Mobile Safari, iOS 18.6, and event WebView, iOS 18.6/27.0:** Passed. The WebView check opened Comic Con and returned to native controls without payment. iOS 27 guest preparation remains unverified: native text entry was unreliable, and its formatted phone field could not be reliably cleared. The plain-text helper now verifies entered text and makes one bounded, slower retry; masked phone/card/password controls retain their separate handling.
- **Public discovery diagnostic, iOS 18.6:** Not passing in the final check. The first run correctly rejected the dry run's leftover basket. A fresh-state rerun timed out while resolving the Adult quantity control after incrementing it. The public dry-run spec passed the same checkout journey without the diagnostic captures; the separate capture-heavy spec still needs investigation.
- **iOS 26 on this Mac:** Comic Con remained on Loading event. The October 4 19:07:41 WebContent report shows JavaScriptCore `PAC_EXCEPTION`; a similar crash occurred October 3, before the folder/logging changes. A second October 4 crash belonged to the duplicate simulator, which was removed. Two simulators causing the crash is unproven. The same app JavaScript opens the event on iOS 18; the user reports it opens on their real iPhone. Mobile Safari on iOS 26 also failed during remote browser access. These are blocked, not passed.
- **Signing:** Rebuilt with Xcode signing enabled; the executable now embeds `application-identifier`. The new iOS 18 process no longer logged Keychain `-34018`. The former unsigned recipe lacked that identity. This repairs the local build recipe; it does not establish the cause of the WebKit crash. See [Apple's entitlement guidance](https://developer.apple.com/forums/thread/114456).
- **Login:** The older build on iOS 18 and fresh rebuilt app on iOS 27 abort in `swift_task_dealloc` when opening Login, before email entry. Organizer and personal-account navigation remain blocked there; their individual destinations were not checked. A related [Google reCAPTCHA SDK report](https://github.com/GoogleCloudPlatform/recaptcha-enterprise-mobile-sdk/issues/183) describes this signature. Its runtime workaround did not resolve our crash and was removed. SDK causality still requires symbolicated confirmation.
- **Desktop Safari:** Enabling automation was approved, but macOS still requires owner authentication. Run `sudo /usr/bin/safaridriver --enable` in your own Terminal and authenticate locally, then run `TARGET=desktop-safari npm test`. Do not share the Mac password. This test has not passed yet.
- **Android and standalone harnesses:** Not executed; no Android build/emulator or standalone harness build is available here. Scanning and four-payment mobile Point of sale purchases are not implemented/proven by the current login-entry spec. Hosted CI is not part of this local verification.

## Temporary personal-account test

> **TODO — DELETE AFTER THIS QA PASS:** Remove this command and its spec when a disposable buyer account replaces the personal account. Keep personal credentials out of source, CI, screenshots, and reports.

Set `SHOWPASS_PERSONAL_EMAIL` and `SHOWPASS_PERSONAL_PASSWORD` privately, then run `REUSE_INSTALLED_APP=1 RESET_APP=1 npm run test:buyer:navigation`. It checks bottom tabs and account screens/WebViews; tested simulator builds exited at Login before it could reach them.

`npm run check` checks lint, formatting, types, and unit tests without launching an app.
