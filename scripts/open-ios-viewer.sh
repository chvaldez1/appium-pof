#!/bin/sh
set -eu

ios_udid=${1:-${IOS_UDID:-}}
if [ -z "$ios_udid" ]; then
  echo 'Pass a simulator UDID or set IOS_UDID.' >&2
  exit 1
fi

xcode_developer_path=$(xcode-select -p)
if [ -d "$xcode_developer_path/../Applications/DeviceHub.app" ]; then
  viewer="$xcode_developer_path/../Applications/DeviceHub.app"
elif [ -d "$xcode_developer_path/Applications/Simulator.app" ]; then
  viewer="$xcode_developer_path/Applications/Simulator.app"
else
  echo 'No Device Hub or Simulator app found in the selected Xcode.' >&2
  exit 1
fi

open -a "$viewer" --args -CurrentDeviceUDID "$ios_udid"
