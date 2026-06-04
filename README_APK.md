# Build APK (TWA) for Instagram Backcheck

This guide prepares a Trusted Web Activity (TWA) Android package from the PWA web app in this folder.

Prerequisites
- Java JDK 11+
- Android SDK + platform tools and build-tools
- Android Studio (recommended) or command-line Gradle
- Node.js and npm
- Optional: `jq` for parsing JSON in scripts

Quick steps
1. Make sure your web app is hosted and reachable (or serve locally and use your computer IP).
2. Edit `twa-config.json` and set `host` to your web host (e.g. `example.com` or `192.168.1.10:8000`).
3. (Optional) Generate a keystore for signing APKs if you want a release-signed APK:

```bash
keytool -genkey -v -keystore keystore.jks -alias key0 -keyalg RSA -keysize 2048 -validity 10000
```

Fill the path and passwords into `twa-config.json` under `signing`.

4. Install Bubblewrap CLI (if not installed):

```bash
npm install -g @bubblewrap/cli
```

5. Run the provided build script (it will `bubblewrap init` and `bubblewrap build`):

```bash
./build-apk.sh
```

6. Open the generated Android project (typically in `android/` folder) with Android Studio and build a signed APK using the provided keystore, or build from CLI:

```bash
# inside android project
./gradlew assembleRelease
```

The release APK will be available at `android/app/build/outputs/apk/release/app-release.apk` (or similar path).

Notes and tips
- Bubblewrap requires a valid Web App Manifest (`manifest.json`) and that the site is served over HTTPS for production builds. For local testing you can use HTTP with `localhost` or local IP but signing may require adjustments.
- If you prefer a more automated cloud approach, use PWABuilder (https://www.pwabuilder.com/) which can generate APKs/TWAs online.
- If you want, I can prepare a GitHub Actions workflow to build the APK on CI and attach the artifact. Tell me whether you want a debug or a release-signed APK.
