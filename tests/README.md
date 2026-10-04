# Choose a test

Complete the [first iPhone run](../README.md#first-iphone-run) once. Then run these commands from the Appium repository root with `IOS_UDID` set. Appium starts and stops automatically; the terminal prints the selected test title and its final pass/fail result.

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

The public checkout and Organizer commands read QA accounts from a local [showpass-playwright](https://github.com/showpass/showpass-playwright) checkout. If it is outside the standard Showpass repos folder, set `PLAYWRIGHT_REPO_PATH` to its absolute path. You can instead supply the Organizer account through private `SHOWPASS_ORGANIZER_EMAIL` and `SHOWPASS_ORGANIZER_PASSWORD` environment values. Public checkout also needs `PUBLIC_GUEST_EMAIL_BASE`, `PUBLIC_GUEST_NAME`, and `PUBLIC_GUEST_PHONE` when not using the Playwright fixture. Each public run checks out as a guest with a fresh email.

The purchase runner prints an `appium-<timestamp>` tag and saves results under `artifacts/ios-app/purchase/runs/<run-tag>/`. If the payment outcome is uncertain, do **not** submit another purchase. Run `npm run recover:public -- <run-tag>` to read the saved order and ticket; recovery never clicks Pay. Other JUnit results live under `artifacts/<target>/junit/`.

## Temporary personal-account test

> **TODO — DELETE AFTER THIS QA PASS:** Remove this command and its spec when a disposable buyer account replaces the personal account. Keep personal credentials out of source, CI, screenshots, and reports.

Set `SHOWPASS_PERSONAL_EMAIL` and `SHOWPASS_PERSONAL_PASSWORD` privately, then run `REUSE_INSTALLED_APP=1 RESET_APP=1 npm run test:buyer:navigation`. It checks bottom tabs and account screens/WebViews; tested simulator builds exited at Login before it could reach them.

`npm run check` checks lint, formatting, types, and unit tests without launching an app.
