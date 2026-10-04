# Showpass Appium QA

TypeScript tests for [Showpass beta](https://beta.showpass.com/) on Safari and the Showpass mobile app. WebdriverIO runs the tests; Appium controls the browser or simulator. Appium starts and stops with each test run, so you do not need a separate server terminal.

| Coverage                                              | Current status                                                                      |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------- |
| iPhone app: Comic Con public Adult ticket             | Earlier local dry run and test-card purchase passed; latest data refactor is unrun. |
| Desktop and iPhone Safari                             | Page-load smoke tests are ready; the manual GitHub Actions jobs await a hosted run. |
| iPhone mobile Box Office, Android, app purchase in CI | Planned; no passing automation claim yet.                                           |

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

Each run uses a fresh guest email and submits payment at most once. The beta test order is left in place. `REUSE_INSTALLED_APP=1` reuses the installed app; repeat runs do not rebuild, download, or reinstall it. Install again only when the build changes. Results are written under `artifacts/ios-app/purchase/`.

## Project checks

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
