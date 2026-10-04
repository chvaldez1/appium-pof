# Build, launch, and debug the iPhone app

Use this to build, open, and debug Showpass on an iPhone simulator. **If you already have a simulator `.app`, skip the build and go to [Open an existing app](#4-open-and-debug-the-installed-app).** A build made with the steps below is a **Beta iOS simulator `.app` built from source**, not the TestFlight binary. For a fresh build, you need an Apple Silicon Mac with Xcode and an iOS simulator runtime, [nvm](https://github.com/nvm-sh/nvm), Ruby 3.3+ with Bundler, and access to `showpass-frontend` and its mobile beta configuration. The [frontend mobile README](https://github.com/showpass/showpass-frontend/blob/develop/packages/mobile/README.md) covers those prerequisites. Run the build commands below in one terminal so the exported paths and version values remain available.

## 1. Prepare the Appium checkout

Open a terminal in the **root of this Appium repository**:

```sh
export APPIUM_ROOT="$PWD"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
. "$NVM_DIR/nvm.sh"
nvm install
nvm use
npm ci
npx appium driver install xcuitest
export MOBILE_VERSION_NUMBER="$(node -p "require('./config/app-build.json').iosBeta.version")"
export MOBILE_BUILD_NUMBER="$(node -p "require('./config/app-build.json').iosBeta.build")"
```

`config/app-build.json` names the Beta build this PoC expects. Set it to the intended version and build before starting if you are testing a different release. These values label the local build; they do **not** make it identical to a TestFlight binary. Record the frontend source commit you build.

The Appium driver install is needed once per QA machine. If `npx appium driver list --installed` already shows `xcuitest`, skip that line on later setups.

## 2. Build from a fresh frontend checkout

Clone the frontend as a sibling of this repository. If you already have a checkout, skip `git clone` and set `FRONTEND_ROOT` to that checkout instead. The source ref below is the one verified for this PoC; change it only when you intend to test another revision and update the expected build metadata. Use a clean checkout: the build updates three mobile key files and generates native files.

```sh
git clone --branch develop https://github.com/showpass/showpass-frontend.git ../showpass-frontend
export FRONTEND_ROOT="${FRONTEND_ROOT:-$(cd ../showpass-frontend && pwd)}"
cd "$FRONTEND_ROOT"
git switch --detach c84fbb7ad2
git rev-parse --short HEAD
nvm install
nvm use
corepack enable
pnpm install --frozen-lockfile
cd packages/mobile
bundle install
cd "$FRONTEND_ROOT"
```

Set the version/build from the Appium configuration in this disposable frontend checkout, then prepare the Beta JavaScript and iOS dependencies:

```sh
node <<'JS'
const fs = require('node:fs');
for (const environment of ['development', 'beta', 'production']) {
  const path = `packages/mobile/keys.${environment}.json`;
  const keys = JSON.parse(fs.readFileSync(path, 'utf8'));
  keys.public.VERSION_NUMBER = process.env.MOBILE_VERSION_NUMBER;
  keys.public.BUILD_NUMBER = process.env.MOBILE_BUILD_NUMBER;
  fs.writeFileSync(path, `${JSON.stringify(keys, null, 2)}\n`);
}
JS
SENTRY_DISABLE_AUTO_UPLOAD=true SENTRY_DISABLE_NATIVE_DEBUG_UPLOAD=true pnpm mobile:build:beta
cd packages/mobile
```

Compile a self-contained Beta simulator app. The explicit deployment target and ad hoc signing avoid Xcode 27 failures seen with the frontend's standard Fastlane simulator lane. The small patch below changes a **generated** Pods script; do not commit it. If the generated script differs, stop and inspect it rather than applying an unknown edit.

```sh
python3 - <<'PY'
from pathlib import Path
p = Path('ios/Pods/Target Support Files/Pods-mobile/Pods-mobile-frameworks.sh')
s = p.read_text()
old = 'lipo -remove "$arch" -output "$binary" "$binary"'
new = 'temp_binary="${binary}.lipo-temp"\n      lipo -remove "$arch" -output "$temp_binary" "$binary"\n      mv -f "$temp_binary" "$binary"'
if old in s:
    p.write_text(s.replace(old, new))
elif new not in s:
    raise SystemExit('Generated Pods script changed; inspect it before building.')
PY
SENTRY_DISABLE_AUTO_UPLOAD=true SENTRY_DISABLE_NATIVE_DEBUG_UPLOAD=true xcodebuild \
  -workspace ios/mobile.xcworkspace -scheme Beta -configuration Beta \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath fastlane/releases/ios/beta-build \
  ARCHS=arm64 ONLY_ACTIVE_ARCH=YES IPHONEOS_DEPLOYMENT_TARGET=16.0 \
  CODE_SIGNING_ALLOWED=NO CODE_SIGN_IDENTITY=- EXPANDED_CODE_SIGN_IDENTITY=- build
export BUILT_APP="$PWD/fastlane/releases/ios/beta-build/Build/Products/Beta-iphonesimulator/mobile.app"
```

This direct build was verified on Apple Silicon with Xcode 27. It is for a simulator only; do not use it for a device archive or store upload. The frontend's `pnpm fastlane:ios:sim:beta` is the intended long-term lane, but it failed on Xcode 27 because generated Pods targets declared deployment versions below the SDK minimum.

## 3. Install and run Appium

Return to the Appium checkout and copy the freshly built `.app`. Choose an available iPhone simulator UDID from the list. Skip `boot` if that simulator is already booted.

```sh
cd "$APPIUM_ROOT"
nvm use
ditto "$BUILT_APP" apps/Showpass-Beta-Simulator.app
codesign --force --deep --sign - apps/Showpass-Beta-Simulator.app
xcrun simctl list devices available
export IOS_UDID="<simulator-UDID>"
xcrun simctl boot "$IOS_UDID"
xcrun simctl bootstatus "$IOS_UDID" -b
APP_PATH=apps/Showpass-Beta-Simulator.app npm run app:check
xcrun simctl install "$IOS_UDID" apps/Showpass-Beta-Simulator.app
npm run app:check
```

The first `app:check` verifies the new `.app` against `config/app-build.json`; the second checks what the simulator actually has installed. To watch the app, open the simulator viewer with the command in [step 4](#4-open-and-debug-the-installed-app). Then run this **read-only launch test** from the Appium checkout:

```sh
TARGET=ios-app REUSE_INSTALLED_APP=1 npm test
```

It should bring Showpass Beta to the foreground and pass one test. It does not log in, purchase, or scan.

## 4. Open and debug the installed app

If you already have a simulator `.app`, skip steps 1–3. From the Appium checkout, select a simulator from `xcrun simctl list devices available` and install your build once:

```sh
export IOS_UDID="<simulator-UDID>"
xcrun simctl install "$IOS_UDID" "apps/<your-simulator-build>.app"
```

The simulator must be booted first; use `xcrun simctl boot "$IOS_UDID"` if its status is **Shutdown**. Installing a different build with the same bundle ID replaces the app currently installed on that simulator. Skip `install` on later launches unless you change builds.

On **macOS before 26**, older Xcode opens the phone in **Simulator**. On **macOS 27+ with Xcode 27+**, use **Device Hub**. **macOS 26 can have either**, because Device Hub arrived with Xcode 27, which also supports macOS 26.4. The viewer is determined by the installed Xcode rather than the macOS number alone. The command below finds the available viewer, so you can use it on all three Mac versions. [Apple's Device Hub overview](https://developer.apple.com/videos/play/wwdc2026/260/) explains the Xcode 27 change.

To open **Showpass Beta yourself**, without starting an Appium test, run:

```sh
XCODE_DEVELOPER_PATH="$(xcode-select -p)"
if [ -d "$XCODE_DEVELOPER_PATH/../Applications/DeviceHub.app" ]; then
  open -a "$XCODE_DEVELOPER_PATH/../Applications/DeviceHub.app" --args -CurrentDeviceUDID "$IOS_UDID"
else
  open -a "$XCODE_DEVELOPER_PATH/Applications/Simulator.app" --args -CurrentDeviceUDID "$IOS_UDID"
fi
xcrun simctl launch "$IOS_UDID" com.showpass.swift.beta
```

The last command prints `com.showpass.swift.beta: <process-ID>` and opens the app on the selected simulator. You can tap through it normally. This reuses the installed app; it does not rebuild, reinstall, reset its data, or need Metro. If you want to stop it before another launch, run `xcrun simctl terminate "$IOS_UDID" com.showpass.swift.beta`.

To investigate a native crash, open `packages/mobile/ios/mobile.xcworkspace` from your **frontend checkout** in Xcode, select the same simulator, and choose **Debug → Attach to Process → mobile** while the app is running. Use Xcode's debug console and breakpoints for native code. The app's executable is named `mobile` even though its bundle ID is `com.showpass.swift.beta`.

To change React Native JavaScript and use Metro's development tools, run these commands from the **frontend checkout** and keep Metro running:

```sh
pnpm mobile:build:dev
cd packages/mobile
pnpm start:dev
```

Then open `ios/mobile.xcworkspace` in Xcode, select the **Development** scheme and your simulator, and press **Run**. The [frontend mobile development guide](https://github.com/showpass/showpass-frontend/blob/develop/packages/mobile/README.md) describes this workflow. It creates a separate **Development/local** build; it is not the self-contained Beta app above, so reproduce a beta-only issue with the Beta build. This development build workflow was not validated as part of this PoC.

For the next Appium launch test, keep the app installed and run just `TARGET=ios-app IOS_UDID=<simulator-UDID> REUSE_INSTALLED_APP=1 npm test` from the Appium checkout. Appium starts and stops with the test; rebuilding and reinstalling are only needed when the app binary changes.

Verified for this PoC on October 4, 2026: frontend commit `c84fbb7ad2`, Apple Silicon/Xcode 27, Beta 3.7.2 (180), and one passing Appium launch test using a fresh `xcuitest` driver installation. Login, purchase, and scanning were not part of this build check.
