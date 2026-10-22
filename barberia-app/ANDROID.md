# Running BarberIA on an Android phone

How to build the app and install it on a physical Android phone over USB, from Ubuntu.

All commands run from the `barberia-app/` folder unless noted:

```bash
cd ~/Escritorio/barberIA/barberia-app
```

---

## Quick start (every time)

Once the one-time setup below is done, this is all you need:

1. Connect the phone by USB and unlock it.
2. Open a terminal and go to the project:
   ```bash
   cd ~/Escritorio/barberIA/barberia-app
   ```
3. Check the phone is detected (optional):
   ```bash
   adb devices
   ```
4. Launch the app with live reload:
   ```bash
   npx ionic capacitor run android -l --external
   ```
5. Pick `samsung SM-A225M` from the list. Edit and save files; the phone updates on its own.
6. Stop with `Ctrl+C` when done.

Without live reload (for example, to install a fixed version that runs without the PC):

```bash
npx ng build --configuration development && npx cap sync android && npx ionic capacitor run android --no-build
```

---

## 1. One-time setup

### 1.1 Android Studio and the Android SDK
1. Install Android Studio (installed here with snap: `/snap/bin/android-studio`).
2. Open it with `android-studio` and finish the first-run wizard with the **Standard** setup.
   This downloads the SDK to `~/Android/Sdk`.
3. If the wizard does not appear: **More Actions → SDK Manager** and install:
   - *Android SDK Platform* (latest)
   - *Android SDK Platform-Tools* (SDK Tools tab)
   - *Android SDK Command-line Tools* (SDK Tools tab)
4. Check it exists:
   ```bash
   ls ~/Android/Sdk
   ```

### 1.2 Environment variables
Capacitor needs to know where the SDK is (`ANDROID_HOME`) and needs **Java 21 or newer** (`JAVA_HOME`).
The system Java is 17, which is too old, so use the Java bundled with Android Studio.

Append to `~/.bashrc`:

```bash
echo 'export ANDROID_HOME=$HOME/Android/Sdk' >> ~/.bashrc
echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator' >> ~/.bashrc
echo 'export JAVA_HOME=/snap/android-studio/current/jbr' >> ~/.bashrc
echo 'export PATH=$JAVA_HOME/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

Verify (or open a new terminal first):

```bash
echo $ANDROID_HOME   # /home/develop/Android/Sdk
java -version        # 21 or newer (Android Studio ships 25)
```

### 1.3 Prepare the phone
1. **Settings → About phone** → tap **Build number** 7 times to enable developer options.
2. **Settings → Developer options** → enable **USB debugging**.
3. Connect the phone with a USB **data** cable and accept the "Allow USB debugging?" prompt.
4. Check it is detected:
   ```bash
   adb devices
   ```
   Expected output: a line ending in `device` (for example `R58RA3KEQGY  device`).

### 1.4 Add the Android platform
Only needed once; it creates the `android/` folder (already done in this project).

```bash
npx ionic capacitor add android
```

---

## 2. Build and run on the phone

With the phone connected and unlocked:

```bash
npx ionic capacitor run android
```

Pick the phone (`samsung SM-A225M`) from the list. The app is built, installed and opened.

### Live reload (recommended while developing)
The app reloads on the phone every time you save a file. The phone and the PC must be on the same Wi-Fi.

```bash
npx ionic capacitor run android -l --external
```

### Without live reload
After changing web code, rebuild and copy it into the native project before running:

```bash
npx ng build
npx ionic capacitor sync android
npx ionic capacitor run android
```

### From Android Studio
```bash
npx cap open android
```
Select the phone in the device dropdown and press ▶.

---

## 3. Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `No devices or emulators found` | The SDK is missing or `ANDROID_HOME` is not loaded in the current terminal. | Install the SDK (1.1), then `source ~/.bashrc` or open a new terminal. |
| `adb: command not found` | Platform-tools not on `PATH`. | Install the SDK and set the variables (1.2). |
| `adb devices` shows `unauthorized` | The phone did not accept the debugging prompt. | Unlock the phone and accept the prompt. |
| `adb devices` shows nothing | Charge-only cable or USB debugging off. | Try another cable/port; check 1.3. |
| `BUILD FAILED` … `invalid source release: 21` | Gradle is running with Java 17. | Set `JAVA_HOME` to Android Studio's Java (1.2). |
| `adb server version doesn't match this client` | Two `adb` binaries (the apt one in `/usr/bin` and the SDK one). | `sudo apt remove adb` and keep the SDK one. |
| White screen on the phone | JavaScript error at runtime. | Open `chrome://inspect` in Chrome on the PC to see the phone's console. |

To see the full error when a build fails:

```bash
cd android
./gradlew assembleDebug
```
