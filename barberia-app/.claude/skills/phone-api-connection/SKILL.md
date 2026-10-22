---
name: phone-api-connection
description: Fix "Http failure response", "Could not load appointments" or "Unknown Error" when the app on the USB-connected Android phone cannot reach the local API. Use whenever the phone app fails to load data or the voice assistant cannot connect to the backend.
---

# Phone cannot reach the API

The app on the phone calls `http://localhost:3000`. That only works while the USB tunnel `adb reverse` is active; without it `localhost` on the phone is the phone itself.

## Diagnose (run all, in order)
```bash
export PATH=$PATH:$HOME/Android/Sdk/platform-tools
curl -s -m 5 -o /dev/null -w "%{http_code}\n" localhost:3000/appointments   # backend up? expect 200
adb devices                                                                 # phone listed as "device"?
adb reverse --list                                                          # tunnel active? expect "tcp:3000 tcp:3000"
```

## Fix by cause
| Finding | Fix |
|---|---|
| `adb reverse --list` is empty (most common; the tunnel is lost when the cable is reconnected, adb restarts or the phone reboots) | `adb reverse tcp:3000 tcp:3000` |
| `adb devices` empty or `unauthorized` | Unlock the phone, check cable/port, accept the USB debugging prompt. If still empty: `adb kill-server && adb start-server`, then redo the reverse. |
| Backend not answering | In `barberia-api`: `npm run start:dev`. A missing `.env` still lets it boot (in-memory data), but the assistant needs `GEMINI_API_KEY`. |
| Error shows `https://CHANGE-ME.example.com` | The installed build is a production build. See below. |

After the fix, just reopen or retry in the app; no rebuild is needed unless the API URL was wrong.

## Wrong API URL in the installed app
`ng build` defaults to the production configuration (`environment.prod.ts`), and `ionic capacitor sync` / `ionic capacitor run` rebuild in production on their own. Install with:
```bash
cd barberia-app && npm run install_app
```
(`ng build --configuration development && cap sync android && ionic capacitor run android --no-build`). Verify the APK:
```bash
unzip -p android/app/build/outputs/apk/debug/app-debug.apk 'assets/public/*.js' | grep -o "apiUrl:[^}]*" | sort -u
```
It must show `http://localhost:3000`.

## Alternative without USB tunnel
Use the PC LAN IP (`hostname -I`) as `apiUrl` in `src/environments/environment.ts`, same Wi-Fi, and `sudo ufw allow 3000/tcp`. The IP can change, so it needs updating.
