---
name: build-sync-android
description: Build the web app in development mode and sync it into the Android project so it can be run from Android Studio or installed on the phone. Use after changing front-end code, or when asked to build, sync, compile or put the app on Android.
---

# Build and sync to Android

Compiles the Angular/Ionic code with the **development** environment (`apiUrl: http://localhost:3000`) and copies it into `android/`.

## Steps
1. Build and sync (run from `barberia-app/`):
   ```bash
   npx ng build --configuration development && CAP_ENV=development npx cap sync android
   ```
   - Use `npx cap sync`, **not** `ionic capacitor sync`: the Ionic CLI rebuilds in production and puts the `CHANGE-ME` URL back.
2. Verify the bundle copied to Android uses the right API URL:
   ```bash
   grep -l "CHANGE-ME" android/app/src/main/assets/public/*.js    # must print nothing
   grep -l "localhost:3000" android/app/src/main/assets/public/*.js  # must print a file
   ```
   If `CHANGE-ME` appears, repeat step 1 (a production build overwrote it).
3. Tell the user the sync is done and how to launch:
   - **Android Studio**: open `barberia-app/android` (or `npx cap open android`) and press **Run ▶**. Gradle JDK must be Java 21.
   - **Command line**: `npm run install_app` builds, syncs and installs on the USB phone.

## Only when the user asks to install on the phone
```bash
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64 PATH=$JAVA_HOME/bin:$PATH:$HOME/Android/Sdk/platform-tools
adb reverse tcp:3000 tcp:3000
CAP_ENV=development npx ionic capacitor run android --target <device-id> --no-build   # device id from `adb devices`
```
`--no-build` is required so Ionic does not rebuild in production.

## Notes
- Native changes (manifest, plugins) need a reinstall; web-only changes also need this sync, because the phone runs the copied files, not live code.
- If the phone cannot load data afterwards, use the `phone-api-connection` skill.
