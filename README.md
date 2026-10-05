# Showpass Appium QA

TypeScript + WebdriverIO tests for the Showpass Beta iPhone app and Safari. Appium starts automatically for each test. This repository does not include the mobile `.app` binary; build it from `showpass-frontend` or supply a compatible simulator build.

## First iPhone run

This path gets a new reviewer from clone to a **read-only launch test**. The source-build recipe was verified on an Apple Silicon Mac with Xcode 27 and an iPhone simulator runtime. You need [nvm](https://github.com/nvm-sh/nvm); building the app also needs Ruby 3.3+ with Bundler and access to the mobile Beta configuration.

1. **Install this repository and Appium's iPhone driver.**

   ```sh
   git clone https://github.com/chvaldez1/appium-pof.git
   cd appium-pof
   export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
   . "$NVM_DIR/nvm.sh"
   nvm install
   nvm use
   npm ci
   npx appium driver install xcuitest
   ```

   The driver installation is one-time per QA machine. Skip it if `npx appium driver list --installed` already shows `xcuitest`.

2. **Get the Showpass Beta simulator app.** Follow the [source-build guide](apps/README.md) to create `apps/Showpass-Beta-Simulator.app`. If you already have a compatible simulator `.app`, copy it to that path with `ditto "/path/to/Showpass-Beta-Simulator.app" apps/Showpass-Beta-Simulator.app`. Device/TestFlight `.ipa` files cannot run in a simulator. The expected bundle ID and version live in [config/app-build.json](config/app-build.json).

3. **Choose your simulator once.** Run `xcrun simctl list devices available`, pick an iPhone, then copy the local settings template:

   ```sh
   cp .env.example .env.local
   ```

   Edit `IOS_UDID` in `.env.local` to the UUID beside that iPhone. Tests and app commands load this ignored file automatically. Keep `REUSE_INSTALLED_APP=1` to reuse the installed build. Change the UUID there to switch devices; an explicit shell value takes precedence.

   ```sh
   npm run app:check
   npm run app:install
   npm run app:check -- --installed
   ```

   The first check reads the `.app` you built; the second verifies the installed app. `app:install` boots the selected simulator, installs the build, and opens the phone window. Later, use `npm run app:open` to launch it without reinstalling. The viewer opens **Simulator** with older Xcode or **Device Hub** with Xcode 27+. On macOS before 26, expect Simulator. On macOS 27+ with Xcode 27, expect Device Hub. macOS 26 can have either, so the script checks the selected Xcode rather than guessing from macOS. [Apple introduced Device Hub with Xcode 27.](https://developer.apple.com/videos/play/wwdc2026/260/) You can watch the phone there while Appium runs.

4. **Run one test.**

   ```sh
   npm run test:launch
   ```

   Wait for the terminal to report **1 passing**. This test brings Showpass Beta to the foreground and checks that Explore appears. It does not log in, buy, or scan. Results are in `artifacts/ios-app/junit/`. Appium starts and stops with the command; you do not need a separate server. The app remains installed, so later runs need only `npm run test:launch`.

To check **Account → Login**, run `npm run test:login`. It opens the login screen and checks for the email field. Tested simulator builds exited before the form appeared; the test reports that exit explicitly. Check the reported error before classifying a new failure. `screens/ios/auth/login.ts` holds selectors and actions and is not a runnable test. See the [test catalog](tests/README.md) for guest checkout, Organizer, Safari, and other commands.

## Current proof

- The Beta launch check passed on iOS 27, 26, and 18 simulators on October 4, 2026.
- This machine's ignored `.env.local` selects Showpass QA iPhone iOS 18 (18.6), where the final guest preparation check passed. Keep your own device UUID in that file.
- The freshly rebuilt 3.7.2 (180) app passed guest checkout preparation on iOS 18.6. One $25.46 Adult purchase was completed and its saved Mobile order, charge, and issued ticket were verified. The original run exposed an incorrect website-source assertion; that assertion was corrected and the same order was recovered without another payment. The full payment spec was not resubmitted after that correction.
- Mobile Safari passed on iOS 18.6; the event WebView passed on iOS 18.6 and 27.0. On this Mac, iOS 26 event loading is blocked by a WebKit crash; see the test catalog for evidence.
- Employee Login exited on the tested simulator builds before Organizer navigation or mobile Point of sale could run. Ticket scanning and mobile Point of sale purchase are not proven by Appium yet.
- Hosted Safari and app-purchase CI runs are still to be verified.

## Where to look

- `tests/` contains runnable tests. Named `npm run test:*` commands choose a spec and print its test title and result.
- `screens/ios/` contains reusable iPhone page objects; `screens/webview/` contains WebView page objects shared across platforms. `flows/ios/` combines them into journeys.
- `shared/` holds test data, helpers, and purchase/order checks. `config/test-settings.ts` holds targets and named waits.
- [tests/README.md](tests/README.md) lists all current test commands and safe purchase recovery.
- [apps/README.md](apps/README.md) holds the full Beta simulator build and debugging details.

Run `npm run check` before sharing code changes; it checks lint, formatting, types, and unit tests without launching the app.

Use import aliases instead of climbing folders:

```ts
import { iosLoginPage } from '@screens/ios/auth/login.ts';
import { timeoutMs } from '@config/test-settings.ts';
import { contextId } from '@shared/helpers/context-id.ts';
```

Aliases are defined in `tsconfig.json` and resolved by the TypeScript/tsx runtime used by the scripts and WebdriverIO.
