# Showpass Appium QA

TypeScript tests for [Showpass beta](https://beta.showpass.com/) on Safari and the Showpass mobile app. WebdriverIO runs the tests; Appium controls the browser or simulator. Appium starts and stops with each test run, so you do not need a separate server terminal.

| Coverage                                  | Current status                                                                                                                                                                                                        |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iPhone app: Comic Con public Adult ticket | An earlier guest dry run and test-card purchase passed. The newer label-based ticket selector and per-run recovery files have passed code checks, but not a device rerun.                                             |
| iPhone app: Organizer dashboard           | Eight tile-to-screen checks are implemented. Both the older 3.6.7 (135) and local-source 3.7.2 (180) simulator builds exited at Login; the TestFlight build is untested.                                              |
| iPhone app: ticket check-in               | No Appium scan test exists yet. Read-only ticket lookup passed, but both tested simulator builds exited before employee login; the issued ticket remains unused. See **09 Appium → Ticket Scanning** in the QA vault. |
| iPhone app: iOS version launch matrix     | The same beta build passed launch on iOS 27.0, 26.3.1, and 18.6 simulators on October 4, 2026.                                                                                                                        |
| Desktop and iPhone Safari                 | Page-load smoke tests are ready; the manual GitHub Actions jobs await a hosted run.                                                                                                                                   |
| iPhone mobile Box Office                  | Employee Login exited the local-source 3.7.2 (180) simulator build on iOS 26, before sign-in; no Box Office purchase has run. The TestFlight build is untested here.                                                  |
| Android and app purchase in CI            | Planned; no passing automation claim yet.                                                                                                                                                                             |

## First iPhone run

Start with the [build, launch, and debug guide](apps/README.md). If you already have a simulator `.app`, [install and open that build directly](apps/README.md#4-open-and-debug-the-installed-app); you do not need to rebuild it. The guide also covers a fresh build, one-time Appium driver setup, and a read-only launch check. `app:check` verifies the intended bundle ID, version, and build against `config/app-build.json`.

The purchase and Organizer tests below also use a local clone of [showpass-playwright](https://github.com/showpass/showpass-playwright) for their Customer and Organizer fixtures. If it is outside the standard Showpass repos folder, set `PLAYWRIGHT_REPO_PATH` to its absolute path (for example, `export PLAYWRIGHT_REPO_PATH=/path/to/showpass-playwright`). The Appium project reads those fixtures at runtime; it does not copy credentials into this repo.

Run the safe checkout test:

```sh
IOS_UDID=YOUR_SIMULATOR_UUID REUSE_INSTALLED_APP=1 npm run test:public:dry-run
```

Watch the booted iPhone in **Simulator** and leave the terminal open for `PASSED` or `FAILED`. `Invoice read preflight passed` is only the first check. The dry run selects one Comic Con Adult ticket and fills the test-card checkout, then **stops before payment**.

To submit **one beta test-card purchase** and verify the saved order and issued ticket:

```sh
IOS_UDID=YOUR_SIMULATOR_UUID REUSE_INSTALLED_APP=1 npm run test:public
```

Each run uses a fresh guest email and submits payment at most once. The beta test order is left in place. `REUSE_INSTALLED_APP=1` reuses the installed app; repeat runs do not rebuild, download, or reinstall it. Install again only when the build changes. The terminal prints a unique `appium-<timestamp>` run tag; its recovery marker and result stay under `artifacts/ios-app/purchase/runs/<run-tag>/` so a later run cannot overwrite them.

If payment outcome is uncertain, **do not submit again**. Read the saved order and ticket using the printed tag:

```sh
npm run recover:public -- appium-1234567890123
```

The recovery command requires that run's saved marker and only reads beta purchase data; it never clicks the payment button. Each purchase run keeps its JUnit report in the same run folder. The purchase runner requests a clean session with `RESET_APP=1`; it does not request a full uninstall. Discovery and purchase runs do not save checkout screenshots or page sources after guest details are entered.

For a future isolated CI job without the Playwright clone, provide `SHOWPASS_ORGANIZER_EMAIL` and `SHOWPASS_ORGANIZER_PASSWORD` as protected secrets plus `PUBLIC_GUEST_EMAIL_BASE`, `PUBLIC_GUEST_NAME`, and `PUBLIC_GUEST_PHONE`. The runner generates a fresh guest address from that base for each run. The hosted purchase job itself is not configured or verified yet.

## Organizer dashboard links

With the same installed iPhone app and the Playwright Organizer fixture, run:

```sh
IOS_UDID=YOUR_SIMULATOR_UUID REUSE_INSTALLED_APP=1 npm run test:organizer:navigation
```

This read-only test signs in, selects **Organization For System Gateway Payment Intent**, and checks that all eight organizer tiles open a rendered screen: Check in, Point of sale, Manage events, Event stats, Employees, My stats, Guestlist, and Product stats. Each tile is reported separately in a JUnit report under the printed result folder. It restarts the app between tiles to return to the organization selector, but keeps the installed app and signed-in session; it does not rebuild, reinstall, or delete anything. It suppresses automatic screenshots and command-level logs because this run enters account credentials. Set `SHOWPASS_ORGANIZATION_NAME` if testing another Venue. In CI, supply `SHOWPASS_ORGANIZER_EMAIL` and `SHOWPASS_ORGANIZER_PASSWORD` as protected secrets; locally the runner reads the existing Playwright fixture when those variables are absent.

The tested 3.6.7 (135) simulator build exited at **Account → Login** before sign-in. The newer TestFlight 3.7.2 (180) build has not been tested by this project, so its login behavior is unknown. A successful code check does not prove the eight screens passed on a device.

## Temporary personal-account buyer navigation

> **TODO — DELETE AFTER THIS QA PASS:** Remove the personal-account spec, its npm command, and this section when a disposable buyer fixture replaces it. Never save personal credentials in source, CI, screenshots, or shared reports.

With a beta iPhone simulator app already installed, set `SHOWPASS_PERSONAL_EMAIL` and `SHOWPASS_PERSONAL_PASSWORD` privately in your terminal, then run:

```sh
IOS_UDID=YOUR_SIMULATOR_UUID REUSE_INSTALLED_APP=1 RESET_APP=1 npm run test:buyer:navigation
```

The test signs in once, checks Explore, Saved, Upcoming, Orders, and Account, then opens My orders, Waitlists, Memberships, Products, and Credits from Orders. It checks the matching native screen or loaded beta WebView without changing purchases or account settings. An account with no upcoming events should show the native empty state, so there may be no Upcoming WebView to inspect. The run suppresses command logs and automatic screenshots. On October 4, 2026, the installed 3.6.7 (135) beta app exited after tapping Login, before the email form or any tab check. Do not rerun that build for this test; use a corrected simulator build.

## Launch on three iOS versions

As of October 2026, the three newest iOS release families are **27, 26, and 18**. Apple jumped from 18 to 26. This check launches the same beta simulator app on one iPhone simulator per version; it does not log in, buy a ticket, or scan one.

From the project folder, after the first-run setup above:

```sh
npm run test:ios:versions -- --list
npm run test:ios:versions
```

The first line shows which runtimes are installed. If iOS 27 is missing, install it in Xcode's platform components or run `xcodebuild -downloadPlatform iOS -buildVersion 27.0`, then rerun. The runner uses `apps/Showpass-Beta-Simulator.app` by default; set `APP_PATH` to a different beta simulator `.app` if needed. Rebuild older beta bundles from the current frontend source before checking iOS 27: the app needs an iOS scene configuration to launch when built with the iOS 27 SDK. The runner reuses the installed app when its version and build match, installs it if absent or changed, and never deletes the app or simulator. For a rebuilt binary with an unchanged build number, use `REINSTALL_APP=1 npm run test:ios:versions`.

Watch each simulator as it runs. The overall command fails if any of the three runtimes is missing or any launch fails. Read the per-version screenshots/logs and `artifacts/ios-app/versions/summary.json`. For a temporary two-version diagnostic while iOS 27 downloads, use `IOS_MAJOR_VERSIONS=26,18 npm run test:ios:versions`; that is **not** a three-version pass.

## Project checks

The iPhone **Point of sale** purchase needs a working Employee Login first. To check a new beta simulator build without placing an order, run `IOS_UDID=YOUR_SIMULATOR_UUID REUSE_INSTALLED_APP=1 npm run test:box-office:entry`. The 3.6.7 (135) simulator build exited after **Account → Login** on iOS 18 and 27; a local-source 3.7.2 (180) simulator candidate did the same on iOS 26. This does not establish the TestFlight build's behavior. The four priced-basket choices in source are **Card, Cash, Complimentary, and Other** (with a configured subtype such as Cheque); **Free** is the automatic zero-total state. The QA vault's **09 Appium → iPhone Ticket Purchases** note has the detailed evidence. No Box Office payment has been submitted.

Run `npm run check` before sharing a change. It runs lint, formatting verification, TypeScript, and the purchase-helper unit tests. Use `npm run format` to apply formatting. The workflow is prepared to run the same check on pushes and PRs; Safari jobs are manual. Hosted runs and app purchase CI are still to be proved.

## Where the code lives

| Area                  | Where to look                                                                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Native iPhone journey | `test/specs/ios/` starts it; `test/screens/ios/` owns iPhone controls; `test/flows/ios/` joins the steps.                                                                             |
| Android journey       | Future `test/specs/android/`, `test/screens/android/`, and `test/flows/android/` will own Android-only steps.                                                                         |
| Embedded WebView      | `test/specs/webview.smoke.ts` checks context switching. `test/shared/webview/` holds checkout DOM steps usable after switching into the WebView on either platform.                   |
| Safari                | `test/specs/safari.smoke.ts` opens beta in desktop or iPhone Safari; it does not launch the Showpass app.                                                                             |
| Shared purchase proof | `test/shared/data/` holds fixed inputs; `test/shared/purchase/` composes the scenario, creates a unique guest email, and verifies the saved order and ticket.                         |
| Other shared setup    | `test/shared/helpers/` holds page and context helpers; `test/settings.ts` holds targets and named waits. `test/specs/app.smoke.ts` only checks that the selected native app launches. |

Screen and WebView modules use WebdriverIO page objects: lazy selectors and actions such as `openEvent`, `signIn`, and `openTicketPicker` stay with the screen they describe. Flows join those actions and switch between native and WebView contexts. Specs choose a scenario and prove the result; static labels and paths live in `test/shared/data/`. The public iPhone test crosses native screens and the embedded WebView, and a future Android flow can reuse the same DOM and order checks with its own native page objects.

`ios-app` is the target for the Showpass iPhone purchase, even though checkout uses a WebView inside that app. `ios-webview` and `android-webview` are standalone sample-app setup targets. A WebView is a context within an app session, not a third mobile operating system.

For other platforms and build details, follow the QA vault's **09 Appium** notes.
