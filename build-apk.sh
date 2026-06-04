#!/usr/bin/env bash
set -euo pipefail

# Script to initialize and build a TWA Android project using Bubblewrap.
# Requirements:
# - Java JDK (11+)
# - Android SDK (with build-tools and platform installed)
# - Android Studio or command-line Gradle
# - Node.js and npm
# - @bubblewrap/cli installed globally or locally
#
# Usage:
# 1. Edit twa-config.json (set correct host and signing info)
# 2. Run: ./build-apk.sh

CONFIG="twa-config.json"
if [ ! -f "$CONFIG" ]; then
  echo "Missing $CONFIG"
  exit 1
fi

# Read basic values (jq recommended) or instruct user
if command -v jq >/dev/null 2>&1; then
  HOST=$(jq -r '.host' "$CONFIG")
  PACKAGE=$(jq -r '.packageId' "$CONFIG")
  APPNAME=$(jq -r '.appName' "$CONFIG")
else
  echo "Warning: jq not found. Please ensure twa-config.json has correct values and Bubblewrap will prompt for them." 
  HOST=""
  PACKAGE=""
  APPNAME="Instagram Backcheck"
fi

# Ensure bubblewrap is installed
if ! command -v bubblewrap >/dev/null 2>&1; then
  echo "bubblewrap not found. Installing @bubblewrap/cli globally..."
  npm install -g @bubblewrap/cli
fi

# Initialize TWA project
echo "Initializing TWA project..."
if [ -n "$HOST" ]; then
  bubblewrap init --manifest "https://$HOST/manifest.json" --packageId "$PACKAGE" --appVersionName "1.0.0" --appVersionCode 1 || true
else
  bubblewrap init || true
fi

# Build
echo "Building Android project (this requires Android SDK + Gradle)..."
bubblewrap build --skipPwaValidation || true

# After bubblewrap, open Android project or build with gradle
if [ -d "android" ]; then
  echo "Android project generated in ./android"
  echo "You can open it with Android Studio or build from CLI with ./gradlew assembleRelease inside android/"
else
  echo "No android project folder detected; Bubblewrap may have created a different directory. Inspect output above."
fi

echo "Done. See README_APK.md for full instructions."
