# Registro de cambios – BarberIA

Este documento anota, en orden cronológico, cada cambio hecho al proyecto.

## Stack

| Pieza | Versión |
|---|---|
| Ionic (`@ionic/angular`) | 9.x |
| Angular | 22.1.7 |
| Capacitor | 8.5.3 |
| TypeScript | 6.0 |
| Node / npm | 24.21 / 11.19 |

---

## 2026-10-09 · Creación del proyecto base

**Qué se hizo**
- Se generó el proyecto con `npx @ionic/cli start barberia-app blank --type=angular --capacitor --no-git`.
- Plantilla `blank` (una sola página `home`), Angular con componentes standalone, Capacitor integrado.
- Sin repositorio git inicializado (se puede hacer cuando se quiera).
- Se verificó que compila con `npx ng build` (salida en `www/`).

**Estado**
- App vacía, sin funcionalidades propias todavía.
- Capacitor aún sin plataformas nativas (no hay carpetas `android/` ni `ios/`).

**Pendiente / notas**
- `capacitor.config.ts` mantiene `appId: 'io.ionic.starter'`; cambiarlo antes de publicar (p. ej. `com.barberia.app`).
- `npm install` reportó vulnerabilidades en dependencias de desarrollo; revisar más adelante.

**Comandos útiles**
```bash
cd barberia-app
npx ionic serve          # servidor de desarrollo en el navegador
npx ng build             # compilar a www/
npx ionic capacitor add android   # añadir plataforma Android
```

---

## 2026-10-09 · Decisión de arquitectura: backend

**Decisión**
- El backend será un proyecto **aparte** hecho con **NestJS**.
- Por ahora **no se implementa**: este repositorio contiene solo el frontend (Ionic).

**Implicaciones para el frontend**
- La app consumirá una API REST (HTTP) del backend NestJS cuando exista.
- Hasta entonces, cualquier dato necesario se simulará con datos locales (mocks).
- No se usará Firebase/Supabase como backend (descartado en la propuesta inicial).

---

## 2026-10-09 · Project skills added

**What was done**
- Added `.claude/skills/log-changes/SKILL.md`: every change must be recorded in `CAMBIOS.md`.
- Added `.claude/skills/english-only/SKILL.md`: all generated code, comments, docs and UI text must be in English; chat with the user stays in Spanish.

**Pending / notes**
- Earlier entries in this file are still in Spanish and can be translated on request.

---

## 2026-10-09 · .gitignore: track project skills

**What was done**
- Updated `.gitignore` to ignore everything in `.claude/` except `.claude/skills/`, so the skills can be committed while local Claude Code files (e.g. `settings.local.json`) stay out of the repo.

---

## 2026-10-09 · Project skill: no unit tests

**What was done**
- Added `.claude/skills/no-unit-tests/SKILL.md`: unit tests must not be implemented in this project unless the user explicitly asks for them.
- Changes are validated with `npx ng build` instead of `ng test`.

---

## 2026-10-09 · Project skill: feature-based architecture

**What was done**
- Added `.claude/skills/feature-architecture/SKILL.md` with the folder structure (`core`, `shared`, `features/<name>`), dependency rules, Angular/Ionic best practices, data access and naming conventions.

**Pending / notes**
- The current project still has the default Ionic starter layout (`src/app/home`); it will be moved to `features/` when the first feature is implemented.

---

## 2026-10-13 · Appointments and Statistics sections

**What was done**
- Removed the starter `src/app/home` page.
- Added a bottom tab layout: `src/app/core/layout/tabs.page.ts|html` with two tabs, Appointments and Statistics.
- Added feature `src/app/features/appointments/` (list page with status filter, service, mock data, routes).
- Added feature `src/app/features/statistics/` (totals, top services, barbers; service, mock data, routes).
- Updated `src/app/app-routing.module.ts` to lazy-load both features under the tabs layout.

**Current state**
- App opens on Appointments; Statistics is one tab away. Data is mock only. `npx ng build` passes.
- No interfaces/contracts were created on purpose (types are inferred from the mock data).

**Pending / notes**
- Add models/contracts and the real API abstraction when the NestJS backend is defined.

---

## 2026-10-13 · Android platform and device guide

**What was done**
- Added the Android platform (`android/` folder) with Capacitor.
- Added `ANDROID.md`: one-time setup (SDK, `ANDROID_HOME`, `JAVA_HOME`, USB debugging), build/run commands and troubleshooting.

**Current state**
- The app builds with `./gradlew assembleDebug` and runs on a physical phone via `npx ionic capacitor run android`.

**Pending / notes**
- Capacitor 8 requires Java 21+; the system Java is 17, so `JAVA_HOME` points to Android Studio's bundled JBR.
- `appId` is still `io.ionic.starter`.

---

## 2026-10-13 · ANDROID.md quick start

**What was done**
- Added a "Quick start (every time)" section at the top of `ANDROID.md` with the steps to relaunch the app on the phone.

---

## 2026-10-14 · Appointment entity

**What was done**
- Added `src/app/features/appointments/models/appointment.model.ts` (`Appointment`, `AppointmentStatus`) and `appointment-extra.model.ts` (`AppointmentExtra`).
- `Appointment` fields: `id`, `clientName`, `date` (day), `time`, `service`, `barber`, `serviceCost`, `extras` (list of name + price), `status`.
- Typed the mock data and `AppointmentService`; added `getTotal()` (service cost + extras).
- The appointment list now shows service cost, extras and the total per appointment.

**Current state**
- `npx ng build` passes.

**Pending / notes**
- The `client` field was renamed to `clientName`; the backend (`barberia-api`) still uses `client` and has no cost or extras yet.

---

## 2026-10-14 · API connection and voice assistant

**What was done**
- `provideHttpClient()` in `app.module.ts`; `apiUrl` added to `environment.ts` / `environment.prod.ts`.
- `AppointmentService.getAppointments()` now calls `GET /appointments` (maps API `client` → `clientName`). Removed `appointments.mock.ts`.
- `AppointmentListPage` loads asynchronously (`loading` / `error` signals, `refresh()`).
- New `features/assistant/`: `VoiceService` (native speech-recognition plugin, Web Speech API fallback in the browser) and `AssistantService` (`POST /assistant/command`).
- Microphone FAB on the appointment list: listens, sends the text, shows the reply, asks for confirmation before cancelling and refreshes the list.
- Installed `@capacitor-community/speech-recognition`; added `RECORD_AUDIO` permission; `capacitor.config.ts` allows cleartext HTTP (development only).

**Current state**
- `npx ng build` passes. Not yet tested on a device.

**Pending / notes**
- Set `apiUrl` to the machine LAN IP when testing on a phone, and the real URL in `environment.prod.ts`.
- Text-to-speech for replies is not implemented.

---

## 2026-10-14 · Guided voice dialog

**What was done**
- The microphone button now starts a dialog: the assistant asks for the client name, date, time and service one by one, reading each question aloud (`speechSynthesis`) and listening for the answer.
- `AssistantService.bookingTurn()` calls `POST /assistant/booking`; the page keeps the draft and loops until the appointment is created or the user cancels. The list refreshes on success.
- Removed the one-shot command + cancel alert from the page.

**Current state**
- `npx ng build` passes. Not tested on a device.

---

## 2026-10-15 · Voice dialog fixes on device

**What was done**
- `AndroidManifest.xml`: added `<queries>` for `android.speech.RecognitionService` (required on Android 11+ to find the speech recognizer).
- `VoiceService.speak()` resolves after a timeout so a WebView that never fires `onend` cannot freeze the dialog; `listen()` checks `SpeechRecognition.available()` first.
- The page now shows the real error message instead of a generic one.

---

## 2026-10-16 · Voice dialog feedback

**What was done**
- The assistant status text moved to an `ion-footer` (it was below the list, off-screen) and shows "Conectando con el asistente..." as soon as the mic is pressed.
- `AssistantService.bookingTurn()` times out after 20 s so an unreachable backend produces an error message instead of silence.
- The FAB is no longer disabled while the first request is in flight.

---

## 2026-10-16 · Project skill: phone-screen

**What was done**
- Added `.claude/skills/phone-screen/SKILL.md`: checks `adb devices`, runs `adb reverse tcp:3000 tcp:3000` and launches `scrcpy --stay-awake` in the background to mirror the USB-connected phone.

**Current state**
- `scrcpy` and `adb` are already installed (`/usr/bin`).

---

## 2026-10-16 · Device builds use the development environment

**What was done**
- `ng build` defaults to the `production` configuration, which swapped in `environment.prod.ts` (`apiUrl` placeholder) so the phone called `https://CHANGE-ME.example.com`.
- `package.json` `install_app` and the `ANDROID.md` quick start now run `ng build --configuration development` (uses `apiUrl: http://localhost:3000`).

**Pending / notes**
- Set the real production URL in `environment.prod.ts` before a release build.

---

## 2026-10-16 · Fix: Ionic CLI rebuilt in production on sync/run

**What was done**
- `ionic capacitor sync` and `ionic capacitor run` run their own **production** build, overwriting the development build, so the phone kept calling the `CHANGE-ME` URL.
- `install_app` (and the `ANDROID.md` command) now: `ng build --configuration development && cap sync android && ionic capacitor run android --no-build`.
- Verified the APK contains `localhost:3000` and no `CHANGE-ME`.

**Pending / notes**
- Live reload (`ionic capacitor run android -l --external`) may also build in production; check the `apiUrl` it ships if the app cannot reach the API.

---

## 2026-10-17 · Requirements document

**What was done**
- Added `REQUIREMENTS.md`: appointment data model (client name, date, time, service, price, extras, barber, status), functional and non-functional requirements, out-of-scope items and open questions.

**Pending / notes**
- The weekday is derived from `date`, not stored; `time` was added because several clients are booked per day.

---

## 2026-10-17 · Mock data removed

**What was done**
- Deleted `features/statistics/data/statistics.mock.ts`. `StatisticsService` now calls `GET /statistics`; `StatisticsPage` loads on `ionViewWillEnter` with loading and error states.
- Added `features/statistics/models/statistics.model.ts`.
- No mock data remains in `src/`.

**Current state**
- `npx ng build --configuration development` passes. Not yet checked on the device (reinstall required).

---

## 2026-10-19 · Project skill: phone-api-connection

**What was done**
- Added `.claude/skills/phone-api-connection/SKILL.md`: diagnosis and fixes for "Http failure response" on the phone (lost `adb reverse` tunnel, backend down, phone not authorized, production build with the `CHANGE-ME` URL).

**Pending / notes**
- Root cause of today's error: `adb reverse --list` was empty; fixed with `adb reverse tcp:3000 tcp:3000`.

---

## 2026-10-19 · Reconocimiento de voz sin popup de Google

**Qué se hizo**
- `voice.service.ts`: `popup: false` en `SpeechRecognition.start`, para que el micrófono escuche dentro de la app en vez de abrir el diálogo de Google.

**Pendiente / notas**
- Requiere reinstalar la app: `npm run install_app`.

---

## 2026-10-19 · Project skill: build-sync-android

**What was done**
- Added `.claude/skills/build-sync-android/SKILL.md`: runs `ng build --configuration development && cap sync android`, verifies the copied bundle has `localhost:3000` (no `CHANGE-ME`), and explains how to launch from Android Studio or install on the phone with `--no-build`.

---

## 2026-10-19 · Requirements updated

**What was done**
- `REQUIREMENTS.md`: added the validation requirements (FR-15 to FR-18: single barber, no double booking, no past dates, valid date and time) and updated out-of-scope items and open questions.

---

## 2026-10-20 · Settings tab and no status tabs

**What was done**
- Removed the status filter tabs (all / pending / confirmed / completed / cancelled) from the appointment list; it now shows every appointment (the status badge stays).
- New `features/settings` with a **Settings** tab (`settings-outline` icon, route `settings`): lists the shop services, adds one with a typed reactive form (name required ≤ 60, price 0–100000) and deletes one after a confirmation alert. Calls `GET/POST /services` and `DELETE /services/:id` through `ShopServiceService`.
- `REQUIREMENTS.md` updated (FR-2, FR-11, new section 3.6).

**Current state**
- `npx ng build --configuration development` passes and is synced to `android/`; not yet reinstalled or checked on the device.

**Pending / notes**
- Add at least one service in Settings before using the voice assistant.

---

## 2026-10-20 · Centralized Spanish messages (i18n)

**What was done**
- Added a lightweight, type-safe i18n: `core/i18n/messages.es.ts` (catalog, English keys / Spanish values, `MessageKey` type), `core/i18n/i18n.service.ts` (`t(key, params)`, `speechLocale`) and `shared/pipes/translate.pipe.ts` (`| t`). No new dependency.
- Moved every user-visible text of the tabs, appointment list, statistics and settings pages (titles, empty/loading/error states, alerts, placeholders, aria-labels, appointment statuses) into the catalog; `index.html` now has `lang="es"`.
- API messages are never shown raw: Settings maps HTTP 400/404/409 to catalog keys; the voice dialog maps `VoiceError` codes (new `assistant/models/voice-error.ts`), HTTP and timeout errors to catalog keys. `VoiceService` takes the speech locale from `I18nService`.
- Statistics: the API now returns stable keys for the totals and the page translates them; an empty barber name shows "Sin asignar".
- New project skill `centralize-messages`; `english-only` now makes the catalog values the only allowed Spanish; `feature-architecture` lists `core/i18n` and the pipe; `REQUIREMENTS.md` NFR-4 updated.

**Current state**
- `npx ng build --configuration development` passes (strict templates reject unknown keys) and is synced to `android/`. Not yet checked on the device.

**Pending / notes**
- Texts the backend voice assistant speaks (`reply` in `/assistant/booking`) are still hardcoded in Spanish in the API.

---

## 2026-10-20 · english-only skill narrowed to code

**What was done**
- Rewrote `.claude/skills/english-only/SKILL.md`: it now only requires **code** in English (identifiers, file names, comments, docstrings, catalog keys, logs). User-visible text is Spanish through the i18n catalog (`centralize-messages`); documentation, `CAMBIOS.md` and commit messages are no longer forced to English.
- `centralize-messages` and `REQUIREMENTS.md` (NFR-4) aligned with that scope.

---

## 2026-10-20 · npm scripts for the Android project

**What was done**
- `package.json`: added `android:add` (`cap add android`, only when the `android/` folder does not exist), `android:sync` (development build + `cap sync android`) and `android:open` (sync + `cap open android`, opens Android Studio).

**Pending / notes**
- Do not delete and re-add `android/` to "refresh" it: it holds manual changes (`RECORD_AUDIO` permission, speech `<queries>`, cleartext config). `android:sync` is enough.

---

## 2026-10-20 · Fix: `android:open` could not find Android Studio

**What was done**
- Capacitor looks for Android Studio at `/usr/local/android-studio/bin/studio.sh`; here it is installed with snap. `android:open` now sets `CAPACITOR_ANDROID_STUDIO_PATH` to `/snap/android-studio/current/bin/studio.sh` unless the variable is already defined, so it can be overridden on another machine.

---

## 2026-10-20 · `barber` field removed

**What was done**
- Removed `barber` from the `Appointment` model, the API DTO and the appointment list (it now shows only the service).
- Statistics: removed the "Barbers" section and the unused messages (`statistics.barbers`, `statistics.unassignedBarber`, `statistics.appointmentsCount`).
- `REQUIREMENTS.md`: removed the barber field and the open question about asking for the barber.

**Current state**
- `npx ng build --configuration development` passes and is synced to `android/`; not reinstalled on the device.

---

## 2026-10-20 · Documented the npm scripts

**What was done**
- `package.json` cannot hold comments, so a `scripts-info` field (ignored by npm) now describes what each script does and when to use it.

---

## 2026-10-22 · Appointment list always refreshes

**What was done**
- The list loaded only once, when the page was created, so a failed first request (tunnel down, backend restarting) or appointments created elsewhere left it empty or stale until the app was restarted.
- `AppointmentListPage` now reloads in `ionViewWillEnter` (every time the tab is shown) and supports pull-to-refresh (`ion-refresher`).

**Current state**
- `npx ng build --configuration development` passes and is synced to `android/`; needs a reinstall on the phone (Run in Android Studio or `npm run install_app`).

---

## 2026-10-22 · Today's appointments and a calendar

**What was done**
- The Appointments screen now lists only the appointments of the selected day (today by default, ordered by time) under the heading "Citas de hoy" / "Citas del {date}"; the empty state is "No hay citas este día".
- New `features/appointments/components/appointment-calendar`: a month calendar (weeks start on Monday, previous/next month buttons). Days with at least one non-cancelled appointment are painted green, the selected day has a ring and today is underlined. Tapping a day selects it. Built by hand instead of `ion-datetime` because the selected-day style would hide the green mark.
- `shared/utils/date.util.ts` (`toLocalIsoDate`, `parseIsoDate`) so "today" uses the device's local date, never UTC. `I18nService` exposes `locale`; new catalog keys under `appointments.*` (`today`, `onDate`, `emptyDay`, `calendar.*`; `appointments.empty` removed).
- `REQUIREMENTS.md` FR-2 updated.

**Current state**
- `npx ng build --configuration development` passes and is synced to `android/`; needs a reinstall on the phone. The calendar date logic was checked with Node (month layouts, leap year, local vs UTC date).

**Pending / notes**
- If the app stays open past midnight, "today" is only recalculated after a restart.
- Backend: the assistant prompt and statistics still use the UTC date.

---

## 2026-10-23 · Voice button under the list and a smaller calendar

**What was done**
- Removed the floating `ion-fab` microphone button, which covered the appointments (including the status badge). The button is now a round `ion-button` inside an `ion-footer` below the list, always visible and never overlapping; the assistant status text sits above it in the same footer.
- `appointment-calendar` is more compact: max width 280px and centered, smaller day cells, gaps, header and weekday initials (about 270px tall instead of about 360px).

**Current state**
- `npx ng build --configuration development` passes and is synced to `android/`; needs a reinstall on the phone (Run in Android Studio or `npm run install_app`).

---

## 2026-10-23 · Only the list scrolls

**What was done**
- The whole Appointments screen scrolled, so the calendar moved out of view. The calendar and the day title now live in the fixed `ion-header` (extra toolbars); the `ion-content` holds only the appointment list, so only the list scrolls and the voice bar stays below it.

**Current state**
- `npx ng build --configuration development` passes and is synced to `android/`; needs a reinstall on the phone.

**Pending / notes**
- On small phones the fixed calendar leaves less room for the list; a collapsible calendar could be added if needed.

---

## 2026-10-23 · Cancel button with confirmation (flag, not delete)

**What was done**
- Each active appointment has a **Cancelar** button. It opens a confirmation alert; on confirm the app calls `PATCH /appointments/:id/cancelled` and updates the list in place. The appointment is not deleted: it stays in the list, dimmed and struck through, with a "Cancelada" badge (active ones show "Activa"). A toast reports a failure.
- The model now has `cancelled: boolean` instead of `status`; removed the status labels and colours. The calendar marks only days with a non-cancelled appointment.
- New catalog keys `appointments.state.*` and `appointments.cancel.*` (the `status.*` keys were removed). `REQUIREMENTS.md` updated (data model, FR-13, FR-14, FR-24).

**Current state**
- `npx ng build --configuration development` passes and is synced to `android/`; needs a reinstall on the phone, and the Supabase migration must be run first (see the API's `CAMBIOS.md`).

---

## 2026-10-26 · Micrófono: reintento cuando el reconocedor nativo falla al instante

**Qué se hizo**
- Diagnóstico con `adb logcat` (teléfono y emulador): el permiso `RECORD_AUDIO` y el micrófono funcionan. El fallo venía del plugin `@capacitor-community/speech-recognition`: en cada `start()` destruye el reconocedor anterior y la desconexión del servicio de Google rechaza la sesión nueva en pocos milisegundos ("Didn't understand, please try again."), aunque el micrófono sigue abierto. La app lo trataba como `no-speech` y cortaba el diálogo.
- `VoiceService.listenNative()` ahora detecta un rechazo en menos de 1 s, espera 500 ms y reintenta una vez (`startNative()`).

**Pendiente / notas**
- En el emulador hay que habilitar el micrófono del PC: Extended controls → Microphone → "Virtual microphone uses host audio input" (o `adb emu avd hostmicon`); se desactiva al reiniciar el emulador.
- El paquete offline de voz en español no está instalado en los dispositivos probados; el reconocimiento depende de internet.

---

## 2026-10-26 · Barra de progreso al enviar cada respuesta del diálogo de voz

**Qué se hizo**
- Al enviar cada respuesta al asistente (`POST /assistant/booking`) se muestra en el pie una `ion-progress-bar` con el texto "Enviando respuesta... N %" (`assistant.sending`).
- `AppointmentListPage.sendAnswer()`: la barra avanza de forma estimada hasta el 90 % mientras se espera la respuesta, llega al 100 % al recibirla, se mantiene 300 ms y se oculta. Si la petición falla, desaparece y se muestra el error habitual.

**Pendiente / notas**
- El porcentaje es estimado: una petición tan pequeña no informa de su progreso real.

---

## 2026-10-26 · Diálogo de voz: 2 reintentos por pregunta antes de cortar

**Qué se hizo**
- Antes, cualquier fallo a mitad del agendamiento (no se oyó la respuesta, error de red o timeout) cortaba el diálogo y había que empezar de nuevo.
- `listenWithRetries()`: si no se escucha nada (`no-speech`), el asistente dice "No te escuché." y repite la misma pregunta, hasta 2 veces.
- `withSendRetries()`: si el envío al servidor falla (`HttpErrorResponse` o timeout), muestra "Reintentando (n de 2)..." y reenvía la misma respuesta tras 1 s, hasta 2 veces. También se aplica a la primera llamada (útil si el servidor de Render está dormido).
- En todos los reintentos se conservan los datos ya contestados (`draft`).
- Los errores de permiso, dispositivo sin reconocimiento o navegador sin soporte siguen cortando de inmediato.
- Textos nuevos: `assistant.retry.listen` y `assistant.retry.send`.

---

## 2026-10-26 · Nuevo diseño de la barra de envío

**Qué se hizo**
- La barra pasa a ser el componente `features/assistant/components/send-progress` (`<app-send-progress [progress]>`), en lugar de `ion-progress-bar` dentro de la página.
- Diseño: tarjeta redondeada con un icono circular con degradado (avión de papel, que pasa a ✓ al terminar), texto "Enviando respuesta..." y el porcentaje grande a la derecha. Debajo, una barra gruesa redondeada con degradado primario → terciario y un brillo animado.
- Al llegar al 100 % cambia a verde con el texto "Respuesta enviada" (`assistant.sent`).
- Entra con una animación suave. Respeta `prefers-reduced-motion` y el modo oscuro, porque usa variables de color de Ionic.
- `assistant.sending` ya no incluye el porcentaje; se muestra aparte.
