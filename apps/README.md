# Build Showpass Beta for an iPhone simulator

This guide creates `apps/Showpass-Beta-Simulator.app` from frontend source. Simulator apps are ignored by Git, so a fresh clone does not contain one. Start with the [repository setup](../README.md#first-iphone-run), then follow these steps if you do not already have a Beta simulator `.app`. This is not the TestFlight binary.

Use an Apple Silicon Mac with Xcode, an iOS simulator runtime, [nvm](https://github.com/nvm-sh/nvm), Ruby 3.3+ with Bundler, and access to the mobile Beta configuration in `showpass-frontend`. Keep these build commands in one terminal so exported paths remain available.

## 1. Set the build version

From the Appium repository root:

```sh
export APPIUM_ROOT="$PWD"
export MOBILE_VERSION_NUMBER="$(node -p "require('./config/app-build.json').iosBeta.version")"
export MOBILE_BUILD_NUMBER="$(node -p "require('./config/app-build.json').iosBeta.build")"
```

`config/app-build.json` states the expected local Beta version and build. Change it only when testing a different release, and record the frontend commit you build. Matching numbers do not make a source build identical to TestFlight.

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

Compile a self-contained Beta simulator app. Keep Xcode signing **enabled**: simulator Keychain entitlements must be embedded in the executable at build time. An unsigned build followed by plain `codesign` loses that setup. The explicit deployment target avoids Xcode 27 failures seen with the frontend's standard Fastlane simulator lane. The small patch below changes a **generated** Pods script; do not commit it. If the generated script differs, stop and inspect it rather than applying an unknown edit.

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
  CODE_SIGNING_ALLOWED=YES CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY=- build
export BUILT_APP="$PWD/fastlane/releases/ios/beta-build/Build/Products/Beta-iphonesimulator/mobile.app"
```

This direct build was verified on Apple Silicon with Xcode 27. It is for a simulator only; do not use it for a device archive or store upload. The frontend's `pnpm fastlane:ios:sim:beta` is the intended long-term lane, but it failed on Xcode 27 because generated Pods targets declared deployment versions below the SDK minimum.

## 3. Copy the simulator app into this repository

After `xcodebuild` succeeds, return to the Appium checkout and save the output under the standard ignored path:

```sh
cd "$APPIUM_ROOT"
nvm use
ditto "$BUILT_APP" apps/Showpass-Beta-Simulator.app
codesign --verify --deep --strict apps/Showpass-Beta-Simulator.app
```

Continue at [install and run the first test](../README.md#first-iphone-run). Keep the app installed for later runs; rebuilding is only needed when the binary changes.

## Debugging the app

To open the installed Beta app yourself, choose `IOS_UDID` in `.env.local`, then run from the Appium repository root:

```sh
npm run app:open
```

This opens the phone window and launches the installed app without rebuilding or starting a test.

To inspect a native crash, open `packages/mobile/ios/mobile.xcworkspace` from the frontend checkout in Xcode, select the same simulator, and choose **Debug → Attach to Process → mobile** while Showpass Beta is running. The executable is `mobile`; its bundle ID is `com.showpass.swift.beta`.

For React Native JavaScript changes and Metro tools, use the [frontend mobile development guide](https://github.com/showpass/showpass-frontend/blob/develop/packages/mobile/README.md). Its Development scheme builds a separate local app, so reproduce Beta-only behavior with the Beta simulator build. That Development build workflow has not been validated by this PoC.
