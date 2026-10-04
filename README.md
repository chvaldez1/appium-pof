# Showpass Appium QA

TypeScript tests for [Showpass beta](https://beta.showpass.com/) on Safari and the Showpass mobile app. WebdriverIO runs the tests; Appium controls the browser or simulator. Appium starts and stops with each test run, so you do not need a separate server terminal.

| Coverage                                  | Current status                                                                                                                                                                                              |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iPhone app: Comic Con public Adult ticket | An earlier guest dry run and test-card purchase passed. The newer label-based ticket selector and per-run recovery files have passed code checks, but not a device rerun.                                   |
| iPhone app: Organizer dashboard           | Eight tile-to-screen checks are implemented; device execution is blocked at employee Login on the current beta build.                                                                                       |
| iPhone app: ticket check-in               | Proof of concept is blocked before employee login: the installed beta simulator app exits when Login opens. The issued test ticket remains unused. See the QA vault's **09 Appium → Ticket Scanning** note. |
| iPhone app: iOS version launch matrix     | The same beta build passed launch on iOS 27.0, 26.3.1, and 18.6 simulators on October 4, 2026.                                                                                                              |
| Desktop and iPhone Safari                 | Page-load smoke tests are ready; the manual GitHub Actions jobs await a hosted run.                                                                                                                         |
| iPhone mobile Box Office                  | Employee Login exits the current beta simulator app on iOS 18 and 27; no Box Office purchase has run.                                                                                                       |
| Android and app purchase in CI            | Planned; no passing automation claim yet.                                                                                                                                                                   |

## First iPhone run

You need:

- A Mac with Xcode and an iPhone simulator.
- Node **24.21.0** through [nvm](https://github.com/nvm-sh/nvm#installing-and-updating).
- A beta **simulator** `.app` build. The QA vault's **09 Appium → Showpass Mobile App** note explains how to get one; a device IPA or TestFlight build cannot run in a simulator.
- A local clone of [showpass-playwright](https://github.com/showpass/showpass-playwright) with the Customer and Organizer test fixtures.

From the parent folder of your clone:

```sh
cd appium-pof
nvm install 24.21.0
nvm use 24.21.0
npm ci
```

Put the simulator build at `apps/Showpass-Beta-Simulator.app`. List your simulators, then boot and install the app **once**:

```sh
xcrun simctl list devices available
xcrun simctl boot YOUR_SIMULATOR_UUID
xcrun simctl bootstatus YOUR_SIMULATOR_UUID -b
xcrun simctl install YOUR_SIMULATOR_UUID apps/Showpass-Beta-Simulator.app
```

Skip `boot` when the simulator is already running. If your Playwright repo is outside the standard Showpass repos folder, set `PLAYWRIGHT_REPO_PATH` to its absolute path (for example, `export PLAYWRIGHT_REPO_PATH=/path/to/showpass-playwright`). The Appium project reads the existing Customer and Organizer fixture values; it does not copy credentials into this repo.

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

The current beta simulator build exits at **Account → Login** before sign-in, so this navigation run is blocked until a corrected build opens the login form. A successful code check does not prove the eight screens passed on a device.

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

The iPhone **Point of sale** purchase needs a working Employee Login first. To check a new beta simulator build without placing an order, run `IOS_UDID=YOUR_SIMULATOR_UUID REUSE_INSTALLED_APP=1 npm run test:box-office:entry`. The current 3.6.7 (135) simulator build exits after **Account → Login** on both iOS 18.6 and 27.0. The four priced-basket choices in source are **Card, Cash, Complimentary, and Other** (with a configured subtype such as Cheque); **Free** is the automatic zero-total state. The QA vault's **09 Appium → iPhone Ticket Purchases** note has the expected Comic Con totals and the blocking evidence. No Box Office payment has been submitted.

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

The public iPhone test crosses both native screens and the embedded WebView. Its iPhone flow makes the context switch, then calls shared WebView steps; a future Android flow can use the same DOM and order checks with its own native controls.

`ios-app` is the target for the Showpass iPhone purchase, even though checkout uses a WebView inside that app. `ios-webview` and `android-webview` are standalone sample-app setup targets. A WebView is a context within an app session, not a third mobile operating system.

For other platforms and build details, follow the QA vault's **09 Appium** notes.
