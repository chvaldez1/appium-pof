# Local app builds

Put local beta simulator `.app` or Android `.apk` builds here. Git ignores the binaries. For the iPhone public purchase run, install `Showpass-Beta-Simulator.app` once and set `REUSE_INSTALLED_APP=1`; other app targets can use an absolute `APP_PATH`.

For iOS simulator tests, use a simulator `.app`; a TestFlight/device IPA will not install in a simulator. For Android emulator tests, use a compatible beta `.apk`. Record where each build came from before testing.
