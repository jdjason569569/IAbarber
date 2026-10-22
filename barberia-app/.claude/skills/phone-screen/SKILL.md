---
name: phone-screen
description: Show the physical Android phone's screen on the PC with scrcpy. Use when the user asks to see, mirror, view or start the phone screen, or wants to watch the app running on the USB-connected phone.
---

# Show the phone screen (scrcpy)

Mirrors the USB-connected Android phone in a window on the PC so the user can watch the app running.

## Steps
1. Check the phone is connected and authorized:
   ```bash
   adb devices
   ```
   - It must list a device ending in `device`. If it says `unauthorized`, ask the user to unlock the phone and accept the USB debugging prompt. If the list is empty, ask them to check the cable and that USB debugging is on.
2. Make the phone reach the local API through `localhost:3000` (safe to repeat):
   ```bash
   adb reverse tcp:3000 tcp:3000
   ```
3. Launch scrcpy in the **background** (it blocks until the window is closed):
   ```bash
   scrcpy --stay-awake
   ```
   Use the Bash tool with `run_in_background: true`.
4. Tell the user the window should be open and that closing it stops the mirroring.

## Notes
- `scrcpy` and `adb` are installed at `/usr/bin`. If `scrcpy` is missing: `sudo apt install scrcpy` (the user must run it; it needs sudo).
- Add `--turn-screen-off` to keep the phone screen off while mirroring.
- To see the app's console and network calls, use `chrome://inspect/#devices` in Chrome on the PC (not part of this skill).
- Only one scrcpy window per device; if it fails to start, run `adb kill-server && adb start-server` and retry.
