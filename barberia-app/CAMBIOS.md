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

---

## 2026-10-27 · Disponibilidad por día en Configuración

**Qué se hizo**
- Nueva sección "Disponibilidad" en Configuración (`settings/components/business-hours-editor`): de lunes a domingo, un interruptor abierto/cerrado y los selectores "Desde" y "Hasta" (de hora en hora, hasta medianoche), más el botón "Guardar disponibilidad".
- Por defecto, todos los días de 7:00 a medianoche.
- `BusinessHoursService` (`GET`/`PUT /business-hours`) y el modelo `DayHours`.
- El botón "Disponibilidad" de Citas usa el horario del día; antes estaba fijo de 07:00 a 22:00. Si no se puede cargar, usa 07:00 a medianoche.
- Textos nuevos `settings.hours.*`.

---

## 2026-10-27 · Compilación de desarrollo: http y cleartext solo en dev

**Qué se hizo**
- Problema: al comentar `server: { androidScheme: 'http', cleartext: true }` en `capacitor.config.ts` para la APK de producción, la versión de desarrollo (`http://localhost:3000` por `adb reverse`) dejó de llegar al API. Android bloquea el tráfico http desde una app servida en `https://localhost`.
- `capacitor.config.ts` añade ese bloque `server` solo si `CAP_ENV=development`.
- `android:sync` e `install_app` (package.json) y la skill `build-sync-android` pasan `CAP_ENV=development`.
- La APK de producción se genera sin la variable: queda en https y sin cleartext.

**Pendiente / notas**
- Para la versión de desarrollo, usa siempre `npm run install_app` o `npm run android:sync`. Si sincronizas con un `npx cap sync` a secas, la versión de desarrollo vuelve a fallar.

---

## 2026-10-27 · APK de release firmada que apunta a producción

**Qué se hizo**
- Keystore de release `android/app/barberia-release.keystore` (alias `barberia`). Las claves están en `android/keystore.properties`.
- Los dos archivos están en `android/.gitignore` (`keystore.properties`, `*.keystore`, `*.jks`) y no se suben a git.
- `android/app/build.gradle` define `signingConfigs.release` a partir de `keystore.properties`. Si ese archivo no existe, el build sigue funcionando, pero la APK sale sin firmar.
- Pasos de la compilación: `ng build --configuration production`, `npx cap sync android` (sin `CAP_ENV`) y `./gradlew assembleRelease`. La APK apunta a `apiUrl: https://iabarber.onrender.com`.

**Pendiente / notas**
- Haz una copia de seguridad del keystore y de `keystore.properties` fuera del repo. Si se pierden, no podrás publicar actualizaciones de la app con la misma firma.
- Después de compilar el release, vuelve a sincronizar en modo desarrollo con `npm run android:sync` antes de probar con el API local.

---

## 2026-10-28 · Responder por texto cuando la voz no funciona

**Qué se hizo**
- Al agendar una cita, cada pregunta del asistente muestra un campo "Escribe tu respuesta..." con botón de enviar. La primera respuesta que llegue, por voz o por texto, es la que cuenta.
- Al tocar el campo se apaga el micrófono y el resto del diálogo sigue por texto.
- Si el micrófono falla (no oye nada después de los reintentos, falta el permiso, no hay reconocimiento de voz o el navegador no lo soporta), el diálogo ya no se corta. Pasa a texto y no se pierde lo ya respondido.
- Nuevo botón con icono de teclado junto al micrófono: empieza el diálogo directamente por texto.
- Nuevas claves en `messages.es.ts`: `appointments.keyboardLabel`, `assistant.typePlaceholder`, `assistant.sendTyped` y `assistant.textFallback`.
- API: el prompt de `HandleBookingTurnUseCase` ahora dice que las respuestas pueden llegar por voz o escritas.

**Pendiente / notas**
- En modo texto, el asistente sigue leyendo las preguntas en voz alta.
- Una vez en modo texto, no se puede volver a la voz dentro del mismo diálogo.

---

## 2026-10-28 · Cambiar entre voz y texto en cualquier momento del diálogo

**Qué se hizo**
- Antes, cuando el diálogo pasaba a texto (por elección o porque falló el micrófono), seguía en texto hasta terminar. El botón del micrófono no hacía nada y el del teclado se ocultaba.
- Durante el diálogo, los dos botones están siempre visibles. El micrófono vuelve a responder por voz y el teclado pasa a responder escribiendo. Puedes cambiar las veces que quieras, también a mitad de una pregunta. La cita que se va armando no se pierde.
- Al volver a voz desde una pregunta que esperaba texto, se oculta el teclado, aparece otra vez la pregunta y el micrófono empieza a escuchar.
- Al tocar o escribir en el campo de respuesta se pasa a texto, igual que antes.
- El botón del teclado se ve relleno mientras estás en modo texto.
- Textos nuevos: `assistant.switchToVoice` y `assistant.switchToText` (aria-label de los botones durante el diálogo).

---

## 2026-10-28 · Cada modo del asistente tiene su propia interfaz

**Qué se hizo**
- **Modo escritura:** solo se ve la fila de texto: un botón pequeño de micrófono para volver a voz, el campo de respuesta y el botón de enviar. El micrófono grande y el contador se ocultan. Cuando una pregunta espera respuesta, el campo recibe el foco solo y se abre el teclado.
- Mientras el asistente habla o envía, el campo y el botón de enviar quedan deshabilitados.
- **Modo voz:** se ve el micrófono grande. Mientras escucha aparecen "Escuchando..." y el contador. El botón del teclado sirve para pasar a escribir. El campo de texto se oculta.
- Texto nuevo: `assistant.listening`. Estilo nuevo: `.listening-label`.

---

## 2026-10-28 · Botones del asistente más expresivos

**Qué se hizo**
- **Micrófono:** pasa de 56 a 76 px. Tiene degradado del color primario y una sombra de brillo, y se encoge un poco al tocarlo. Mientras escucha se vuelve rojo y aparecen dos anillos que laten (`@keyframes mic-pulse`).
- **Teclado y "volver a voz":** botones redondos con fondo translúcido del color primario. Antes eran botones con solo borde.
- Cada botón del modo voz tiene una etiqueta debajo: "Hablar" y "Escribir" (textos nuevos `assistant.modeVoice` y `assistant.modeText`).
- Ahora se usan los iconos rellenos `mic` y `keypad`. Se quitaron `micOutline` y `keypadOutline`.

---

## 2026-10-28 · Botón para cancelar la creación de una cita

**Qué se hizo**
- Mientras el diálogo del asistente está en marcha, en modo voz o en modo escritura, debajo de los controles aparece un botón rojo "✕ Cancelar".
- Al pulsarlo, el diálogo termina en el momento y sin guardar nada: deja de hablar, apaga el micrófono, deja de esperar el texto y descarta la respuesta pendiente del servidor. Se cierra el teclado y aparece el mensaje "Creación de la cita cancelada.".
- Cómo funciona: una promesa `cancelled` se rechaza con `DialogCancelled` y compite (`untilCancelled`) con cada paso que espera: `speak`, `listen`, respuesta escrita, `bookingTurn` y pausas entre reintentos.
- `VoiceService.stopSpeaking()` corta la lectura en voz alta.
- Textos nuevos: `assistant.cancel` y `assistant.cancelled`. Estilo nuevo: `.cancel-button`.

**Pendiente / notas**
- Si el servidor ya estaba procesando la última respuesta, la petición termina en el backend aunque la app la ignore. Mientras la cita no se confirme, no se crea nada.

---

## 2026-10-28 · El botón Cancelar ya no parece deshabilitado

**Qué se hizo**
- `.cancel-button` tenía un fondo rojo al 14 % y texto rojo. En el tema oscuro parecía un botón deshabilitado.
- Ahora es rojo sólido (`--ion-color-danger`) con texto blanco, sombra roja y efecto al pulsarlo. Además es un poco más grande (40 px de alto, texto de 15 px en negrita).

---

## 2026-10-28 · Disponibilidad: bloquear horas del día actual

**Qué se hizo**
- En Configuración > Disponibilidad, el horario semanal se reemplazó por el día actual. El barbero agrega uno o varios tramos "Desde / Hasta" en los que no estará disponible, los quita con la papelera y guarda.
- Si dos tramos se cruzan, se avisa y no se deja guardar.
- Si hay citas activas dentro de un tramo, la API no guarda y la app muestra cuáles son (por ejemplo, "10:00 Ana"). Hay que cancelarlas primero.
- Las horas bloqueadas no se pueden agendar: tampoco por voz ni reactivando una cita cancelada. Tampoco aparecen en el botón "Disponibilidad" de la lista de citas.
- Se eliminó el componente `business-hours-editor` y se añadió `day-blocks-editor`. Las claves `settings.hours.*` se reemplazaron por `settings.blocks.*`.

**Pendiente / notas**
- Hace falta crear la tabla `unavailable_slots` en Supabase (ver `barberia-api/docs/schema.sql`).
- El horario semanal que ya estaba guardado sigue aplicándose, aunque ya no se ve en la app.

---

## 2026-10-28 · Botón "Escribir" en verde

**Qué se hizo**
- El botón del teclado junto al micrófono tenía un fondo pálido y parecía desactivado. Ahora es verde sólido (`--ion-color-success`), con el icono en blanco y una sombra suave (`.keyboard-button` en `appointment-list.page.scss`).

---

## 2026-10-28 · Subida automática de versión antes de cada commit

**Qué se hizo**
- Nuevo script `scripts/bump-version.mjs` (`npm run version:bump`): sube el patch de `version` en `package.json` y `package-lock.json`, y en `android/app/build.gradle` pone `versionName` igual a esa versión e incrementa `versionCode` en 1.
- Nuevo hook de git `.githooks/pre-commit`: si el commit incluye archivos de `barberia-app/`, ejecuta el script y añade al commit los tres archivos modificados. Los commits que solo tocan `barberia-api/` no suben la versión.
- Scripts `hooks:install` y `prepare` (corre con `npm install`) que configuran `git config core.hooksPath barberia-app/.githooks`. Ya quedó instalado en este repo.

**Pendiente / notas**
- Para hacer un commit sin subir la versión: `SKIP_VERSION_BUMP=1 git commit ...`.
- Si `node` no está en el PATH (IDEs que no cargan nvm), el hook intenta cargar `~/.nvm/nvm.sh`; si aun así no lo encuentra, bloquea el commit.

---

## 2026-10-28 · Versión de la app visible en pantalla

**Qué se hizo**
- Debajo de la barra de pestañas (`core/layout/tabs.page.*`) se muestra en letra pequeña y gris "Versión X.Y.Z". La línea toma el margen inferior del área segura que antes tenía la barra.
- La versión sale de `src/app/core/config/app-version.ts` (`APP_VERSION`), que genera `scripts/bump-version.mjs`. El hook `pre-commit` ahora también agrega ese archivo al commit.
- Nueva clave i18n `app.version` (`Versión {version}`).

---

## 2026-10-28 · Nueva APK de release

**Qué se hizo**
- Se generó `android/app/build/outputs/apk/release/app-release.apk` (4,2 MB) con `ng build --configuration production`, `npx cap sync android` (sin `CAP_ENV`) y `./gradlew assembleRelease`.
- Verificado: firmada con el keystore de release (`CN=David Sarria, O=BarberIA`) y apunta a `https://iabarber.onrender.com` (sin `localhost:3000`).

**Pendiente / notas**
- `android/` quedó sincronizado en modo producción. Antes de probar con el API local, ejecutar `npm run android:sync`.
- Aviso del build: `appointment-list.page.scss` supera el presupuesto de 2 kB (3,17 kB). No bloquea la compilación.

---

## 2026-10-28 · Voz: idioma es-CO con respaldo al idioma del teléfono y errores reales

**Problema**
- En otros teléfonos (p. ej. Moto G84) el agendamiento por voz siempre decía "No te he escuchado". La app pedía el reconocimiento en `es-ES`, que muchos reconocedores de teléfonos latinoamericanos no tienen. Además, `voice.service.ts` descartaba el error del plugin (`.catch(() => null)`), así que cualquier fallo (idioma, red, servicio ocupado) se mostraba como "no te he escuchado".

**Qué se hizo**
- `I18nService.speechLocale` pasa a `es-CO`.
- `VoiceService`: si el reconocedor falla con el error genérico del plugin (el que devuelve cuando el idioma no está soportado), reintenta con el idioma del teléfono y lo recuerda para las siguientes sesiones.
- El error real del plugin se registra con `console.warn('[Voice] ...')` (visible en `adb logcat`) y se traduce a nuevos códigos de `VoiceError`: `network` y `recognizer`.
- Nuevos textos i18n `assistant.errors.voiceNetwork` y `assistant.errors.recognizer`.
- Nueva APK de release (`versionName 0.0.2`, `versionCode 2`) apuntando a `https://iabarber.onrender.com`.

**Pendiente / notas**
- Falta probarla en el Moto G84. Si sigue fallando, conectar por USB y filtrar `adb logcat | grep "\[Voice\]"`.
- `android/` quedó sincronizado en modo producción; usar `npm run android:sync` antes de probar con el API local.

---

## 2026-10-28 · Nombre de la APK con la versión

**Qué se hizo**
- `android/app/build.gradle` nombra la APK como `barberia-<versionName>-<buildType>.apk` (p. ej. `barberia-0.0.2-release.apk`, `barberia-0.0.2-debug.apk`). La versión sale del `versionName` que actualiza `npm run version:bump`.

---

## 2026-10-28 · Botón "Cliente casual"

**Qué se hizo**
- Nuevo botón **Cliente casual** en la barra del día, al lado de "Disponibilidad". Muestra el día de hoy y abre el asistente (voz o texto) con `{ walkIn: true }`. El asistente solo pregunta el servicio, sin nombre, fecha ni hora.
- El API registra al cliente para ahora mismo y corre 30 minutos la cita que se cruza y todas las siguientes del día. La respuesta del asistente dice qué citas se corrieron.
- La lista muestra el badge **Casual** en esas atenciones (`Appointment.walkIn`).
- "Disponibilidad" ignora las atenciones casuales y considera ocupada una hora si hay una cita a menos de 60 minutos (las citas corridas quedan en :30).
- `onMicClick` recibe el borrador inicial del diálogo.
- Textos nuevos: `appointments.walkIn.button` y `appointments.walkIn.badge`.

**Pendiente / notas**
- Requiere el API desplegado y la migración `walk_in` ejecutada en Supabase.

---

## 2026-10-28 · APK release sin conexión a los servicios

**Qué se hizo**
- El APK release se generó sobre el último `android:sync` (build de desarrollo), así que apuntaba a `http://localhost:3000` y no a Render. Se regeneró con build de producción + `cap sync android`.
- Nuevo script `npm run android:release`: build de producción, sync y `assembleRelease` en un solo paso.

**Pendiente / notas**
- No generar el release desde Android Studio justo después de `android:sync`/`install_app`; usar `android:release`. Después, para volver a desarrollo, correr `android:sync`.

---

## 2026-10-28 · Botón "Completar" en cada cita

**Qué se hizo**
- Cada cita activa (no cancelada ni completada) muestra **Completar** arriba de **Cancelar**. Pide confirmación con una alerta y llama a `PATCH /appointments/:id/completed`.
- Una cita completada muestra el badge **Completada** (color `primary`) y ya no tiene botones.
- `AppointmentService.setCompleted`, `Appointment.completed`, y textos nuevos `appointments.state.completed` y `appointments.complete.*`.
- Los ingresos del mes en Estadísticas solo cuentan las citas completadas (cambio del API).

**Pendiente / notas**
- Requiere el API desplegado y la migración `completed` ejecutada en Supabase.

---

## 2026-10-28 · Deshacer cancelar y completar

**Qué se hizo**
- Las citas canceladas muestran **Reactivar** y las completadas muestran **Deshacer**. Las dos piden confirmación y dejan la cita otra vez activa. Sirven para cuando el barbero toca la cita equivocada.
- Si al reactivar ese horario ya está ocupado o bloqueado, se muestra un aviso específico (`appointments.reactivate.taken`).
- Las cuatro acciones de cada cita (`cancel`, `reactivate`, `complete`, `uncomplete`) comparten `confirmAction`/`runAction`. Sus textos están en `appointments.<acción>.*`.

---

## 2026-10-28 · Spinner global al enviar peticiones

**Qué se hizo**
- Overlay global (`core/loading/`): mientras haya una petición al API en curso, la pantalla se oscurece, bloquea los toques y muestra solo la animación del spinner, sin texto. `loading.sending` queda únicamente como `aria-label`.
- `loadingInterceptor` (registrado en `AppModule`) cuenta las peticiones pendientes en `LoadingService`. Se cierra también si hay error, timeout o cancelación. Si hay peticiones en paralelo, espera a que termine la última.
- Los turnos del asistente para agendar (`POST /assistant/booking`) usan `SKIP_LOADING`, porque ya muestran su propia barra de progreso.
- El overlay aparece solo si la petición tarda más de 250 ms, para que no parpadee con las respuestas rápidas.

**Pendiente / notas**
- El pull-to-refresh también muestra el overlay. Si sobra, marcar esas llamadas con `SKIP_LOADING`.

---

## 2026-10-29 · Se quitan los servicios: el asistente pregunta el precio

**Qué se hizo**
- Configuración: se quitaron la lista de servicios y el formulario para agregarlos. Solo queda el editor de disponibilidad. Se borraron `ShopServiceService` y `ShopService`.
- Citas: ya no se muestra el nombre del servicio, solo el precio (etiqueta "Precio") y el total. Se quitó `service` de `Appointment` y del DTO.
- Asistente: `BookingDraft.service` pasa a ser `price`. El asistente y "Cliente casual" preguntan cuánto cuesta el servicio.
- Estadísticas: se quitó la sección "Servicios más pedidos".
- i18n: se borraron los textos de servicios que ya no se usan.

**Pendiente / notas**
- Requiere el API nuevo desplegado (ver `barberia-api/CAMBIOS.md`).

---

## 2026-10-29 · Botón "Editar" en cada cita

**Qué se hizo**
- Cada cita, en cualquier estado y también las de cliente casual, tiene un botón **Editar**. Abre una alerta con el nombre del cliente y el precio, para corregir lo que el barbero dijo mal.
- Si el nombre está vacío o el precio no es válido, la alerta sigue abierta y se muestra un aviso. Si no cambió nada, no se envía nada al API.
- Los avisos de error de la lista pasan a usar `showError`, que comparten las acciones de cada cita.
- `AppointmentService.update` y textos nuevos `appointments.edit.*`.

**Pendiente / notas**
- Requiere el API con `PATCH /appointments/:id` desplegado.

---

## 2026-10-29 · Paleta "Negro y dorado" y tarjetas de cita ordenadas

**Qué se hizo**
- `src/theme/variables.scss`: paleta de barbería. Dorado latón como primario, burdeos como secundario, cuero en terciario, verde botella en success y rojo poste en danger. Fondo carbón, tarjetas marrón oscuro y texto crema. Tokens `--app-radius` y `--app-card-border`.
- `src/global.scss`: la app es siempre oscura (`dark.always.css`) y los títulos van en dorado.
- Lista de citas: cada cita es una tarjeta con borde lateral del color de su estado. Arriba la hora (dorada), el cliente y los badges en una fila; luego el precio, los extras y el total. Abajo, una fila de botones del mismo tamaño con iconos. Ya no se repite la fecha.
- Botones "Cliente casual" y "Disponibilidad" en contorno dorado. La tarjeta del día lleva un degradado dorado y el botón de teclado pasa a burdeos.
- Calendario: los días con citas se marcan en dorado en vez de verde.
- `angular.json`: el presupuesto `anyComponentStyle` sube a 5 kB (aviso) y 8 kB (error), porque los estilos de la lista de citas ocupan 4,6 kB.

**Pendiente / notas**
- Para verlo en el teléfono hay que volver a compilar y sincronizar (skill build-sync-android).

---

## 2026-10-29 · Instalar en el teléfono apuntando al API de producción

**Qué se hizo**
- Script nuevo `npm run install_app:prod`: hace la compilación de producción (`apiUrl` `https://iabarber.onrender.com`), sincroniza sin cleartext e instala en el teléfono USB con `./gradlew installDebug`.
- No necesita el backend local ni `adb reverse`.
- Se instaló en el teléfono la versión que usa el API de producción.

**Pendiente / notas**
- `ionic capacitor run` no sirve para instalar porque busca `app-debug.apk`, y Gradle genera `barberia-<versión>-debug.apk`. Eso también afecta a `install_app`.
- Para volver a desarrollo local: `npm run install_app` + backend local + `adb reverse tcp:3000 tcp:3000`.

---

## 2026-10-29 · Crear cita con una sola petición al final

**Qué se hizo**
- El diálogo de voz o texto hace las preguntas en la app (cliente, fecha, hora, precio; en cliente casual solo el precio) y envía todas las respuestas juntas al terminar (`AssistantService.submitBooking`). Ya no hay una petición por pregunta ni una petición inicial.
- Si el API rechaza un dato (día cerrado, hora ocupada, nombre repetido, respuesta no entendida), la app repite solo esa pregunta con el mensaje del API y vuelve a enviar.
- Textos nuevos `assistant.question.*` y se elimina `assistant.connecting`. El tiempo de espera del envío sube a 30 s.

**Pendiente / notas**
- Necesita el API con soporte de `answers` desplegado.
- Si se dice "cancelar" como respuesta, solo se detecta al enviar al final. El botón Cancelar corta el diálogo al momento.

---

## 2026-10-29 · Modal grande para el diálogo por voz

**Qué se hizo**
- Mientras se agenda por voz se abre un modal a pantalla completa con la pregunta en letra grande, un círculo con la cuenta atrás (rojo y con pulso mientras escucha), la respuesta escuchada en una tarjeta, la barra de envío y los botones **Escribir** y **Cancelar**.
- Al cambiar a texto el modal se cierra y se usa la barra inferior con el campo de respuesta. Al volver a voz, se abre otra vez.
- Señal nueva `dialogAnswer`: la respuesta ya no reemplaza a la pregunta en `assistantReply`.
- Textos nuevos `assistant.modal.answer` y `assistant.modal.waiting`.
- Bajo los botones del modal se apunta cada respuesta con su pregunta (Cliente, Fecha, Hora, Precio), con la señal `dialogLog`. Si una pregunta se repite, su respuesta se reemplaza. Textos nuevos `assistant.modal.log` y `assistant.step.*`.
- Corrección: la lista de respuestas iba debajo de los botones y quedaba fuera de la pantalla en teléfonos pequeños. Ahora va justo debajo de "Tu respuesta". Los botones están fijos en un pie del modal, y la pregunta deja el margen de la barra de estado.
- Paso de revisión antes de enviar: con todas las respuestas, el modal muestra "Revisa los datos antes de enviar" con **Confirmar** (envía), **Editar** y **Cancelar**. Sale también si se respondió escribiendo. **Editar** convierte cada fila en un campo con su etiqueta, con **Guardar** y **Volver**. Si se edita una respuesta que el API ya había aceptado, sale del `draft` y se vuelve a interpretar. Textos nuevos `assistant.review.*`.

---

## 2026-10-29 · Asesor de cortes: forma del rostro con la cámara y vista 3D

**Qué se hizo**
- Investigación: ninguna librería (open source ni de pago) devuelve cortes en 3D a partir de una foto. La investigación de pelo 3D desde una foto (HairStep, SRM-Hair, Im2Haircut) necesita GPU, y las APIs de pago (Perfect Corp Hair API, Banuba) solo hacen pruebas en 2D. Se eligió un enfoque híbrido que corre en el teléfono.
- Pestaña nueva **Cortes** (`features/haircut-advisor/`, ruta `haircut-advisor`). El barbero toma o elige una foto del cliente (`core/camera/camera.service.ts`, `@capacitor/camera`).
- `FaceAnalysisService` usa MediaPipe Face Landmarker (`@mediapipe/tasks-vision`, Apache-2.0) en el teléfono. Mide las proporciones del rostro y rechaza fotos con la cabeza girada más de 15°. La foto no se guarda ni se envía.
- `face-shape.classifier.ts` da la forma (ovalado, redondo, cuadrado, alargado, corazón, diamante, triangular) con su porcentaje, comparando con prototipos calibrados sobre la cara canónica de MediaPipe.
- `HaircutRecommendationService` ordena el catálogo (`data/haircut-catalog.ts`, 9 cortes) según la forma.
- Vista 3D con three.js (`haircut-3d-viewer`): una cabeza ajustada a las proporciones del cliente con el pelo de cada corte generado por código (se gira y se hace zoom). Si un corte tiene `modelPath`, carga ese GLB en su lugar.
- El runtime WASM se copia desde `node_modules` por `angular.json`, y el modelo va en `src/assets/mediapipe/face_landmarker.task` (3,7 MB), así que funciona sin conexión.
- Permiso `CAMERA` en `AndroidManifest.xml`. Textos `tabs.haircutAdvisor` y `haircutAdvisor.*`.

**Estado**
- Probado en Chrome sin interfaz con una foto real: detecta la cara, clasifica y muestra los cortes y la vista 3D.

**Pendiente / notas**
- Los umbrales de forma son heurísticos: calibrar con fotos reales de clientes.
- El pelo 3D es esquemático. Para algo realista, añadir modelos GLB por corte (`modelPath`).
- Falta probar en el teléfono: `npm run install_app`.

---

## 2026-10-29 · Fix camera permission not requested on Android

**What was done**
- `@capacitor/camera` was only in `node_modules`, not in `package.json`, so `cap sync` never registered it in Android and the app fell back to the web file picker (no permission prompt). Added it to `package.json` (`^8.2.6`).
- Running `npm install` pruned other untracked packages; added them to `package.json` too: `three`, `@mediapipe/tasks-vision` and `@types/three` (dev).
- Rebuilt in development and ran `npx cap sync android`; the camera plugin now appears in `android/capacitor.settings.gradle` and `capacitor.plugins.json`.

**Current state**
- The app requests the `CAMERA` permission (already declared in `AndroidManifest.xml`) when taking a photo.

**Pending / notes**
- The app must be reinstalled on the phone (native plugin change).

---

## 2026-10-29 · Haircut advisor: AI pictures of the client instead of the 3D head

**What was done**
- Removed the procedural 3D viewer (`components/haircut-3d-viewer/`) and the `three` / `@types/three` dependencies. `Haircut` no longer has `style` or `modelPath`.
- New `HaircutPreviewService` (`POST /haircut-preview`, skips the global overlay, 180 s timeout) and `HaircutPreviewComponent` (picture, spinner while generating, error with retry, "AI picture" disclaimer).
- `HaircutAdvisorPage` generates the picture of a cut the first time it is selected (the top cut right after the analysis) and keeps one per cut until a new photo is taken.
- i18n: `haircutAdvisor.preview.*` added, `viewerHint` removed, privacy text now says the photo is sent to an AI service (Hugging Face) and not stored.

**Current state**
- Face shape still runs on the phone with MediaPipe; only the cut pictures use the API.

**Pending / notes**
- Needs the API with the `haircut-preview` module running (restart the local API; deploy to Render for production).
- Each picture takes about 20–60 s. The free Hugging Face GPU quota allows only a few pictures per day without `HF_TOKEN`.

---

## 2026-10-30 · Haircut advisor: recommendations and example pictures from the API

**What was done**
- The face is still measured on the phone with MediaPipe, but only the four proportions are sent to `POST /haircut-recommendations`; the API classifies the shape and returns the cuts with their example pictures from Supabase. The photo never leaves the device.
- Removed `services/face-shape.classifier.ts`, `data/haircut-catalog.ts`, `services/haircut-preview.service.ts`, `models/haircut-preview.model.ts` and `components/haircut-preview/`.
- `HaircutRecommendationService` now calls the API (20 s timeout, page spinner instead of the global overlay). `HaircutRecommendation` carries `name`, `description` and `images` from the API.
- New `HaircutExamplesComponent`: sideways gallery of the example pictures, or a placeholder when the cut has none.
- i18n: removed `haircutAdvisor.preview.*` and `haircutAdvisor.cuts.*` (cut texts now come from the catalog); added `haircutAdvisor.examples.*` and `haircutAdvisor.errors.network` (replaces `errors.unknown`); privacy text updated.

**Current state**
- `ng build --configuration development` passes.

**Pending / notes**
- Needs the API with the `haircut-advisor` module and the `haircuts` table in Supabase.
- Reinstall on the phone: `npm run install_app`.

## 2026-10-30 · Fix: camera not working on Android

**What was done**
- `@capacitor/camera` (8.2.6) and `@mediapipe/tasks-vision` were missing from `package.json`, so the camera plugin was never synced to the Android project (absent from `capacitor.settings.gradle`) and the permission was never requested. Both are now real dependencies.
- `AndroidManifest.xml`: added `READ_MEDIA_IMAGES` and `READ_EXTERNAL_STORAGE` (maxSdkVersion 32) for picking from the gallery, next to `CAMERA`.
- Removed stray blank lines from the `package.json` scripts.

**Current state**
- Dev build + `cap sync android` pass; Capacitor lists `@capacitor/camera@8.2.6`.

**Pending / notes**
- Native change: the app must be reinstalled on the phone (`npm run install_app`).

---

## 2026-10-30 · Resumen de la cita agendada por voz

**Qué se hizo**
- Cuando el asistente guarda la cita (`status: 'created'`), se abre un alerta con lo que se agendó: Cliente, Fecha (completa), Hora y Precio, uno por línea, con el botón **Aceptar**. En cliente casual solo sale el precio y el título cambia.
- Método `showBookedSummary` en `AppointmentListPage`; reutiliza `formatDraftValue` de la revisión.
- Textos nuevos `assistant.booked.title`, `assistant.booked.walkInTitle` y `assistant.booked.ok`.
- Clase global `.booked-summary-alert` en `global.scss` para respetar los saltos de línea (Ionic no permite HTML en el mensaje del alerta).
- Corrección: el alerta se abría mientras el modal de voz seguía abierto y no se veía. Ahora se muestra al cerrar el diálogo (en el `finally` de `onMicClick`). Se compiló y sincronizó con Android.

---

## 2026-10-30 · App de producción instalada en el teléfono

**Qué se hizo**
- Compilación de producción (`ng build` + `cap sync android` sin `CAP_ENV`): el API es `https://iabarber.onrender.com` y el tráfico sin HTTPS queda apagado.
- APK armado con `./gradlew assembleDebug`. Gradle lo nombra `barberia-<versión>-debug.apk`, por eso `ionic capacitor run` no lo encuentra (busca `app-debug.apk`); se instaló con `adb install`.
- La app anterior tenía otra firma y Android rechazaba la actualización: se desinstaló y se instaló de nuevo.

**Pendiente / notas**
- El API publicado en Render todavía no tiene el modo `preview` (cambios del API sin commit). Mientras no se publique, el primer envío guarda la cita directamente, sin pasar por la pantalla de revisión.

---

## 2026-10-30 · El resumen de la cita agendada salía vacío

**Qué se hizo**
- Al guardar, el API devuelve `draft: {}` y la cita guardada en `appointment`. El alerta "Cita agendada" usaba el borrador y salía sin datos.
- Nuevo tipo `BookedAppointment` y campo `appointment` en `BookingTurnResult`. La función `bookedDraft` arma el resumen con la cita guardada (cliente, fecha, hora, precio; en cliente casual solo el precio). Si el API no la manda, usa el último borrador enviado.
- Compilado en producción e instalado en el teléfono.

---

## 2026-10-30 · Pregunta del asistente en el centro de la pantalla

**Qué se hizo**
- En el modal de voz, la pregunta, el contador y la respuesta quedan centrados verticalmente (`.voice-dialog` con `justify-content: center` y `min-height: 100%`). Antes quedaban arriba y la mitad de abajo de la pantalla estaba vacía. Si la lista de la revisión es larga, se puede desplazar.
- Compilado en producción e instalado en el teléfono.

**Pendiente / notas**
- La hoja de estilos de la página supera el presupuesto de 5 kB de Angular (7,86 kB). Es solo un aviso; la compilación pasa.
- Corrección: la pregunta se iba desplazando hacia arriba a medida que crecía la lista "Lo que has dicho", porque se centraba todo junto. Ahora la pregunta, el contador y la respuesta van en `.voice-main`, en la fila del medio de una grilla con dos mitades vacías iguales (`minmax(0, 1fr) auto minmax(0, 1fr)`), y la lista va en la fila de abajo. La pregunta queda fija aunque la lista crezca; si la lista no cabe, el modal se desplaza.
- El presupuesto de error de la hoja de estilos es de 8 kB y quedó en 7,99 kB. El próximo estilo que se agregue a esta página lo va a superar: hay que aligerar el archivo o subir el límite en `angular.json`.

---

## 2026-10-30 · Una cita completada libera su hora

**Qué se hizo**
- El botón de disponibilidad del día ya no cuenta como ocupadas las horas de citas completadas (el cliente pudo ser atendido antes de su hora). Va junto con el cambio del API que permite agendar en esa hora.

**Pendiente / notas**
- Compilar e instalar en el teléfono para ver la disponibilidad corregida.

---

## 2026-11-05 · Asesor de cortes con Gemini

**Qué se hizo**
- MediaPipe sigue en el teléfono como filtro rápido (hay cara, mira de frente) y mide las proporciones. Luego la foto, reducida a JPEG de 1024 px (`shared/utils/image.util.ts`, `toJpegDataUrl`), se envía con las proporciones a `POST /haircut-recommendations`, donde Gemini elige los cortes del catálogo.
- `HaircutRecommendations` trae `source`, `hair` (tipo y resumen) y cada corte un `reason`. Timeout del servicio: 45 s.
- La tarjeta de forma del rostro muestra el pelo (tipo y resumen) con la nota "Análisis hecho con IA (Gemini)". Debajo del corte elegido sale "Por qué le queda bien: …".
- Si Gemini falla, el API usa las proporciones y la pantalla se ve como antes (sin pelo ni motivo).
- i18n: `haircutAdvisor.reasonLabel`, `haircutAdvisor.hair.*`; texto de privacidad actualizado (la foto se envía a Gemini y no se guarda).

**Estado**
- `ng build --configuration development` pasa.

**Pendiente / notas**
- Necesita el API nuevo (local o publicado en Render). Reinstalar en el teléfono: `npm run install_app`.
- Prettier reformateó algunos archivos de `features/haircut-advisor` que no tenían ese formato; es solo formato.

---

## 2026-11-05 · Botón "Ver cómo le queda (IA)"

**Qué se hizo**
- Debajo de los cortes recomendados, el corte elegido tiene el botón **Ver cómo le queda (IA)**. El botón llama a `POST /haircut-preview` (`HaircutPreviewService`, timeout 90 s) y muestra la foto del cliente con ese corte, generada con Gemini.
- `HaircutPreviewComponent` maneja los estados botón, generando (spinner), imagen con el aviso "Imagen generada con IA" y error con reintentar. Cada imagen solo se genera al pedirla (cuesta una llamada) y se guarda por corte hasta tomar otra foto.
- Si el API responde 429, sale un mensaje que dice que falta activar la facturación en Google AI Studio.
- El recuadro "Aún no hay fotos de ejemplo" ya no aparece si el corte no tiene fotos de ejemplo.
- i18n: `haircutAdvisor.preview.*`.

**Estado**
- `ng build --configuration development` pasa.

**Pendiente / notas**
- Funciona cuando la key de Gemini tiene facturación activa y el API está publicado. Reinstalar en el teléfono: `npm run install_app`.

---

## 2026-11-05 · Haircut advisor tab hidden

**What was done**
- Commented out the `haircut-advisor` tab button in `src/app/core/layout/tabs.page.html`.

**Current state**
- The haircut advisor no longer appears in the bottom tab bar. The route and feature code remain intact.

**Pending / notes**
- To re-enable, uncomment the tab button.

## 2026-11-05 · Citas de 30 minutos

**Qué se hizo**
- `appointment-list.page.ts`: `APPOINTMENT_MINUTES` 60 → 30 (igual que en la API). "Horas disponibles hoy" ahora lista franjas cada 30 minutos (16:00, 16:30...) y una cita a las 16:00 ya no bloquea las 16:30.

## 2026-11-05 · Alerta "Cita agendada" en verde

**Qué se hizo**
- `global.scss`: la alerta `.booked-summary-alert` (resumen tras agendar o registrar cliente casual) ahora tiene fondo verde oscuro, borde y brillo verde, cabecera verde (`--ion-color-success`), texto blanco y botón "Aceptar" verde, para que no se confunda con el resto de la pantalla oscura/dorada.

## 2026-11-05 · Horas en formato de 12 horas con rango de 30 minutos

**Qué se hizo**
- Nuevo `shared/utils/time.util.ts`: `APPOINTMENT_MINUTES` (30) compartido, `toMinutes`, `formatTime12` ("1:00 p. m.") y `formatTimeRange` ("1:00 – 1:30 p. m."; si cruza mediodía: "11:30 a. m. – 12:00 p. m.").
- Nuevo pipe `timeRange` (`shared/pipes/time-range.pipe.ts`) y `I18nService.meridiemLabels()`; textos "a. m." / "p. m." en el catálogo (`time.am`, `time.pm`).
- Lista de citas: cada tarjeta muestra el rango (`1:00 – 1:30 p. m.`) en vez de `13:00:00`.
- Resumen "Cita agendada" y revisión del asistente: la hora sale como rango de 12 horas.
- "Horas disponibles hoy": una franja por línea en formato de 12 horas (clase `.multiline-alert` en `global.scss`).
- Diálogos de cancelar / completar / reactivar: "a las 1:00 p. m.".
- Editor de bloqueos: el aviso de citas en conflicto usa el rango de 12 horas.

## 2026-11-05 · Nombre del cliente debajo del horario

**Qué se hizo**
- Tarjeta de cita (`appointment-list.page.html/.scss`): la hora y el nombre van en un bloque `.appt-when` en columna; el rango horario arriba y el nombre del cliente justo debajo. Las insignias (Activa, Casual) quedan a la derecha.

---

## 2026-11-05 · Instalación en producción en el teléfono

**Qué se hizo**
- `angular.json`: el presupuesto `anyComponentStyle` sube de 8 kB a 12 kB (error), porque `appointment-list.page.scss` (8,05 kB) frenaba el build de producción.
- `package.json`: `install_app:prod` ahora usa `./gradlew installRelease` en lugar de `installDebug`. El teléfono tiene la app firmada con `barberia-release.keystore`, y el APK debug (otra firma) fallaba con `INSTALL_FAILED_UPDATE_INCOMPATIBLE`.
- Se instaló la v0.0.14 release (API en Render) en el teléfono SM-A225M.
- `global.scss`: el modal de resumen de cita creada (`.booked-summary-alert`) pasa de verde a dorado, reutilizando `--ion-color-primary` (cabecera y botón dorados con texto oscuro, fondo oscuro con tinte dorado).
- Nuevo `features/assistant/components/booked-summary/`: el resumen de cita creada deja de ser un `ion-alert` y pasa a ser un modal tipo tarjeta (centrado y con la altura de su contenido). Lleva un check dorado, un título, un subtítulo (`assistant.booked.subtitle`), filas con icono para cliente, fecha y hora, el precio destacado y un botón ancho "Listo". En `global.scss`, `.booked-summary-alert` se sustituye por `ion-modal.booked-summary-modal`.
- Corrección: el modal `booked-summary` no aparecía. Con `@ionic/angular/lazy`, `ModalController` entrega los `componentProps` con `Object.assign`, que pisaba los `input()` de señal. Ahora son propiedades normales.

---

## 2026-11-06 · Login: admin or guest

**What was done**
- Added `@supabase/supabase-js` and `supabaseUrl`/`supabaseKey` (publishable key) to both environments.
- `core/auth/auth.service.ts`: the admin logs in with Supabase Auth (email + password); guest mode is a flag in `localStorage`. Exposes the `role` signal and the headers for the API.
- `core/auth/auth.interceptor.ts`: adds `Authorization: Bearer` or `X-Guest: 1` to API requests. On a 401 it signs out and goes back to the login.
- `core/auth/auth.guards.ts`: `sessionGuard` on the tabs and `noSessionGuard` on `/login`.
- New feature `features/auth`: the login page with "Entrar como invitado".
- Settings has a "Cerrar sesión" button. The version line shows the role (Administrador / Invitado).
- A role change does a full reload, so no data of the previous session stays in memory.

**Current state**
- `ng build` passes. The admin and the guest see separate appointments and settings (enforced by the API).

---

## 2026-11-06 · Back button to the login

**What was done**
- `core/auth/back-to-login-button.component.ts`: a back arrow at the start of the header of every tab (citas, estadísticas, configuración, cortes). It leaves the current session (admin or guest) and returns to the login, where the other role can be chosen.
- `AuthService.leaveToLogin()` (sign out + full reload to `/login`) is shared by the back arrow, "Cerrar sesión" and the 401 interceptor.
- New message `auth.back`.

---

## 2026-11-07 · Push notifications for the admin

**What was done**
- Dependency `@capacitor/push-notifications` (8.x); `android/app/google-services.json` added (Firebase project, app `com.ia.barberia.app`).
- `src/app/core/notifications/push-notifications.service.ts`: on the native app with an admin session, asks permission, creates the `bookings` channel, registers with FCM and sends the token to `POST /notifications/devices`. Foreground pushes show a toast; tapping a push opens `/appointments`. Guests and the browser never register.
- `AuthService.onBeforeSignOut()`: hooks run before logout; the push service removes the token (`DELETE /notifications/devices`).
- `AppComponent` starts the service; the appointment list reloads when a booking push arrives.
- Messages `notifications.channelName` / `notifications.channelDescription`.

**Current state**
- `ng build`, `ng lint` and `./gradlew assembleDebug` pass (`processDebugGoogleServices` runs).

**Pending / notes**
- Needs testing on a real phone: log in as admin, allow notifications, book from WhatsApp.

## 2026-11-07 · Booking notice stays open until seen

**What was done**
- `PushNotificationsService`: a push received with the app open now shows an `ion-alert` (no timeout, `backdropDismiss: false`) instead of a 5 s toast. Buttons: "Entendido" (closes) and "Ver citas" (opens `/appointments`).
- Messages `notifications.dismiss` / `notifications.viewAppointments`.
- Verified end to end on the phone: Render needed `FIREBASE_SERVICE_ACCOUNT` (base64 JSON key); the phone registers its token on app start as admin.

**Notes**
- With the app in background, Android keeps the system notification in the tray until it is tapped or swiped.
- Unseen bookings: Android hides the heads-up banner by itself, but the push stays in the tray. On app start and every time the app becomes visible (`visibilitychange`), the service reads `getDeliveredNotifications()` and, if any, shows a "Citas nuevas sin ver" modal listing them (`backdropDismiss: false`, back button does not close it). Closing it clears the tray (`removeAllDeliveredNotifications`). Client names are HTML-escaped. Message `notifications.unseenTitle`.
- Installed on the phone with `npm run install_app:prod` and verified: push with the app in background → reopen → modal stays after 15 s and after the back button.
- Booking modal styled with the app yellow (`--ion-color-primary`) background and dark text: class `booking-alert` in `src/global.scss`.

---

## 2026-11-09 · Several bookings are listed in one modal

**What was done**
- `src/app/core/notifications/push-notifications.service.ts`: one single booking modal fed by a list of unseen bookings. A push that arrives while the modal is open is added to its list instead of stacking a new modal on top (which only showed the latest one). With two or more bookings the header is "Citas nuevas sin ver" and each one is a bullet; with one it keeps the push title.
- Returning to the app with the modal open now adds the pushes that reached the tray meanwhile; before they were cleared on close without being shown. Tray pushes are identified by id + tag, because FCM pushes share the id.

**Current state**
- Unseen bookings accumulate until "Entendido" or "Ver citas", which clear the list and the tray.

**Pending / notes**
- A push the barber taps in the tray is removed by Android and opens the app, so it counts as seen and is not in the list.

---

## 2026-11-09 · Fix: booking list did not show every booking

**What was done**
- `src/app/core/notifications/push-notifications.service.ts`: the modal message is plain text (Ionic does not render HTML by default), so bookings are separated by line breaks with the existing `multiline-alert` class instead of `<br>`; `escapeHtml` removed. Bookings are keyed by their text.
- A tapped push, which Android removes from the tray, now joins the list when other bookings are unseen, reading its text from `data.body`. A single tapped push still just opens the appointments.

**Pending / notes**
- Needs the API that sends `data.body` deployed on Render; until then a tapped push stays out of the list.

---

## 2026-11-09 · Tapped push listed without an API change

**What was done**
- `push-notifications.service.ts`: a tapped push (Android gives only its data) is looked up in `GET /appointments` by date and time and added to the list when other bookings are unseen. Replaces reading `data.body`: no API deploy is needed, and the API was left unchanged.
- Message `notifications.bookingLine`.

**Current state**
- Confirmed from the phone's logs that the tapped push was the one missing from the modal. Not yet tested with real pushes after this change.

---

## 2026-11-09 · Client names in bold in the booking modal

**What was done**
- `push-notifications.service.ts`: each booking of the modal is built as DOM nodes (`bookingItem`) with the client name in `<strong>`. Ionic renders `message` as plain text and `innerHTMLTemplatesEnabled` stays off for the rest of the app. Names go in text nodes, so they are never parsed as HTML.

**Pending / notes**
- The name is split at " agendó para ", so that wording must stay the same in the API push and in `notifications.bookingLine`; otherwise the line shows without bold.

---

## 2026-11-10 · Botón atrás de Android bloqueado en la sesión del admin

**Qué se hizo**
- Nuevo `core/navigation/hardware-back-button.service.ts`: registra un listener de `backButton` (`@capacitor/app`) solo en la app nativa.
- En sesión de admin el botón atrás físico ya no saca de la app ni vuelve al login; Ionic sigue usándolo para cerrar modales/alertas.
- Invitado o sin sesión: se mantiene el comportamiento anterior (atrás en el historial del WebView).
- Se inyecta desde `AppComponent`.

**Notas**
- La sesión del admin solo se cierra con la flecha del encabezado (`BackToLoginButtonComponent`).

## 2026-11-10 · Flecha "Volver al inicio" oculta para el admin

**Qué se hizo**
- `BackToLoginButtonComponent` solo se muestra en la sesión de invitado. El admin ya no sale al login al tocar la flecha del encabezado.
- El admin cierra sesión únicamente con **Cerrar sesión** en Ajustes.

## 2026-11-10 · Notificaciones push también para el invitado

**Qué se hizo**
- `PushNotificationsService` registra el token del teléfono con sesión de admin **o** de invitado (antes solo admin). La API envía al invitado la copia de cada cita de WhatsApp.
- Al cerrar la sesión de invitado se borra el token, igual que con el admin.
- Un teléfono recibe las notificaciones de la sesión que tenga abierta: al cambiar de rol, el token pasa al nuevo workspace.

## 2026-11-10 · Se elimina el modo invitado

**Qué se hizo**
- Login: se quitaron el botón "Entrar como invitado", el separador y el texto de ayuda; el subtítulo ahora dice "Ingresa con tu cuenta de administrador."
- `AuthService`: solo existe el rol `admin`; se quitaron `enterAsGuest`, `isGuest` y el encabezado `X-Guest`. Al iniciar se borra la marca `barberia.guest` que dejaban las versiones anteriores.
- Se borró `BackToLoginButtonComponent` (la flecha solo existía para el invitado) y sus usos en Citas, Estadísticas, Asesor de cortes y Ajustes.
- Las notificaciones push vuelven a registrarse solo con sesión de admin.
- El pie de la pestaña muestra siempre "Administrador".
- Se quitaron los textos del invitado del catálogo i18n.

## 2026-11-10 · Correo del admin precargado en el login

- `environment.ts` / `environment.prod.ts`: nueva clave `loginEmail` con el correo del admin.
- `LoginPage` inicia el campo de correo con ese valor; el barbero solo escribe la contraseña (puede cambiar el correo si quiere).

## 2026-11-10 · Avisos de "quiere hablar contigo"

- La API ahora también envía una push cuando un cliente de WhatsApp pide hablar con el barbero ("💬 Quieren hablar contigo"). La app la muestra en el mismo modal de avisos.
- Textos: el modal con varios avisos se titula "💈 Avisos sin ver" y la descripción del canal de notificaciones menciona los dos tipos de aviso.

## 2026-11-10 · Se revierten los textos de "quiere hablar contigo"

- La API ya no envía push cuando un cliente pide hablar con el barbero, así que los textos del canal y del modal vuelven a hablar solo de citas nuevas.

## 2026-11-10 · Gráficas en Estadísticas (Apache ECharts)

**Qué se hizo**
- Dependencia nueva: `echarts@6.1.0` (Apache 2.0). Se importan solo barras, heatmap, calendario, grid, tooltip y visualMap.
- `shared/components/chart/chart.component.ts`: componente `app-chart` que dibuja una opción de ECharts, se redimensiona con su contenedor y se libera al salir.
- `features/statistics/utils/statistics-charts.ts`: construye las tres gráficas:
  1. **Cortes por día**: calendario de calor de los últimos 4 meses.
  2. **Días y horas con más clientes**: mapa de calor día de la semana × hora.
  3. **Ganancia por día**: barras de los últimos 30 días (solo citas completadas).
- Colores: rampa dorada de un solo tono (más = más claro), validada sobre el fondo de las tarjetas; días sin citas en gris oscuro. Al tocar una celda o barra se ve el detalle.
- Textos nuevos en `messages.es.ts` (`statistics.charts.*`); nombres de días y meses con `Intl` en español.
- Si aún no hay historial se muestra "Aún no hay citas para mostrar."

## 2026-11-10 · Datos de prueba en Estadísticas

- `features/statistics/data/statistics.mock.ts`: genera un mes (30 días hasta hoy) de citas inventadas pero creíbles: viernes y sábado con más trabajo, domingos casi siempre cerrado, más citas en la tarde, ~8% canceladas, precios de $15.000 a $35.000 y clientes nuevos que van llegando. Usa una semilla fija, así que siempre se ve igual.
- Con esas citas arma el mismo resumen que devuelve `GET /statistics` (totales + gráficas).
- `StatisticsService.getStatistics('real' | 'mock')`.
- Interruptor **"Datos de prueba"** arriba en Estadísticas, con un aviso cuando está activo. Se recuerda en el teléfono (`localStorage`).
- No toca la API ni la base de datos.

## 2026-11-10 · Estadísticas más simples para el barbero

**Qué se hizo**
- Se quitaron los mapas de calor (calendario y día × hora): obligaban a interpretar tonos de color.
- Arriba, **"Lo importante"**: frases con la respuesta directa
  - 🔥 Tu día más fuerte es el sábado (40 cortes)
  - ⏰ Tu hora más llena es a las 5:00 p. m.
  - 💰 Ganaste $X en los últimos 30 días (promedio por día trabajado)
  - 🏆 Tu mejor día fue el … (cortes y dinero)
- Tres gráficas de barras con títulos en forma de pregunta y el número escrito en cada barra:
  1. **¿Qué día trabajas más?**: cortes por día de la semana.
  2. **¿A qué hora llega más gente?**: las 6 horas con más cortes, de más a menos, en formato "4:00 p. m.".
  3. **¿Cuánto ganaste cada día?**: últimos 30 días con una línea punteada en el promedio; el promedio se escribe arriba de la gráfica.
- Un solo color con significado: **dorado = lo mejor / sobre el promedio**, **gris = el resto**. Sin leyendas de "Menos/Más".
- `app-chart` ahora solo incluye barras, cuadrícula, tooltip y línea de promedio (menos peso).

## 2026-11-10 · Selector Hoy / Semana / Mes en Estadísticas

- Selector arriba de Estadísticas: **Hoy** (solo hoy), **Semana** (últimos 7 días), **Mes** (últimos 30 días). Por defecto, Mes.
- Todo se recalcula en la app para el periodo: las 4 cajas (Cortes, Ganancia, Clientes nuevos, Cancelaciones), las frases de "Lo importante" y las gráficas.
- En **Hoy** solo se muestran las frases de hora y ganancia y la gráfica de horas (comparar días no tiene sentido con un solo día).
- Mensaje propio si el periodo no tiene cortes ("Hoy aún no hay cortes.", etc.).
- Datos de prueba generados con la nueva forma (`daily` con cancelaciones y clientes nuevos, `hourly`).
- Si la API desplegada aún es la anterior (sin `hourly`), las cajas y la ganancia funcionan; la gráfica de horas y la de días de la semana quedan vacías hasta desplegarla.

## 2026-11-10 · Se quitan los datos de prueba de Estadísticas

- Se borró `features/statistics/data/statistics.mock.ts` y el interruptor "Datos de prueba" (con su aviso, textos y estilos).
- `StatisticsService.getStatistics()` vuelve a pedir solo los datos reales a la API.
- La preferencia guardada `barberia.statistics.mock` queda sin uso en los teléfonos que la tenían (no afecta nada).

## 2026-11-10 · Logo de Space Barber Shop en el inicio de sesión

- Nuevo `src/assets/images/logo-space.webp` (480 × 524, 67 KB), sacado de `barberia.jpeg` (1080 × 1187, 567 KB):
  - fondo blanco quitado (transparente), para que se vea bien con fondo claro u oscuro;
  - recortada la franja negra de 6 px que traía abajo la captura.
- Pantalla de inicio de sesión: el logo va arriba del título. Su ancho se ajusta también a la altura de la pantalla (`min(62vw, 34vh, 240px)`), para que el formulario quepa en teléfonos bajos. Menos espacio arriba (12vh → 4vh).
- Texto alternativo en el catálogo: `auth.logoAlt` ("Logo de Space Barber Shop").
- `barberia.jpeg` (original) sigue en la raíz de `barberia-app/` y no se usa en la app.

## 2026-11-10 · Paleta Space Barber Shop (propuesta A): app clara

- Colores sacados del logo, en `src/theme/variables.scss`:

  | Token | Color | Uso |
  |---|---|---|
  | primary | azul real `#2B3A9C` | botones, día elegido, micrófono |
  | secondary | rojo poste `#E3263A` | acentos, botón de teclado, línea bajo la barra superior |
  | tertiary | plata oscura `#6B7394` | etiqueta "sin cita" |
  | success | verde `#1A8A50` | completar |
  | danger | rojo `#D61F33` | cancelar, escuchando |
  | fondo / tarjetas / texto | `#F4F5FA` / `#FFFFFF` / `#141A4A` | |
  | barras superior e inferior | `#141A4A` | texto blanco |

- `global.scss`:
  - la app deja de ser siempre oscura (se quitó `dark.always.css`);
  - la barra superior de cada pantalla es azul noche con una línea roja de 3 px;
  - las barras secundarias (selector de día, Hoy/Semana/Mes) van sobre blanco;
  - el título de las barras pasa de dorado a blanco.
- Colores fijos pensados para fondo oscuro, adaptados:
  - tarjeta de cita agendada: degradado hacia blanco y separadores con `--app-card-border`;
  - sombra de las tarjetas de cita: nuevo token `--app-card-shadow`;
  - versión de la app bajo las pestañas: usa `--ion-tab-bar-color`;
  - gráficas de Estadísticas: azul = lo mejor / sobre el promedio, gris claro = el resto; tooltip azul noche con texto blanco.
- Verificado: `ng build` sin errores; captura del inicio de sesión en tamaño de teléfono. Las pantallas con sesión no se pudieron ver aquí.

## 2026-11-10 · Paleta Space oscura 3 ("Noche con blanco"); se deja la clara

- La app clara (propuesta A) no gustó. Vuelve a ser siempre oscura (`dark.always.css` en `global.scss`), con los colores del logo:

  | Token | Color | Uso |
  |---|---|---|
  | primary | blanco `#FFFFFF`, texto `#141A4A` | botones, día elegido, micrófono, mejor barra en gráficas |
  | secondary | rojo poste `#E3263A` | acentos, botón de teclado, línea bajo la barra superior |
  | tertiary | azul real `#4A63FF` | etiqueta "sin cita" |
  | success / danger | `#34C27A` / `#EF3B4F` | completar / cancelar |
  | fondo / tarjetas / texto | `#0B0E24` / `#161B3F` / `#FFFFFF` | |
  | barras superior e inferior | `#0F1330` | línea roja de 3 px bajo la superior |

- **Bug corregido.** La paleta oscura de Ionic fija fondo, tarjetas, barras y pestañas en `:root.md` / `:root.ios`, que pesan más que el `:root` de `variables.scss`. Por eso esos colores nunca se aplicaban: también con la paleta dorada se veían grises de Ionic (`#121212`, `#1e1e1e`). Ahora `variables.scss` usa `:root, :root.ios, :root.md`, y como carga después de `global.scss`, gana.
- Barras secundarias (selector de día, Hoy/Semana/Mes) con el fondo de la página.
- Gráficas: blanco = lo mejor / sobre el promedio, gris azulado = el resto.
- Progreso de envío al asistente: degradado azul real → rojo. Antes empezaba en `primary`, que ahora es blanco, y su icono blanco no se veía.
- Verificado: `ng build` sin errores; captura del inicio de sesión en tamaño de teléfono. Las pantallas con sesión no se pudieron ver aquí.

## 2026-11-10 · "Valor del servicio" en Configuración

- Nuevo `ServicePriceEditorComponent` (arriba de Disponibilidad) y `ShopSettingsService` (`GET/PUT /settings/service-price`).
- Campo numérico; solo cuentan los dígitos (si escriben "20.000" o "$20000" queda 20000). Debajo se muestra el valor formateado ("$20.000") para detectar ceros de más o de menos. Botón "Guardar valor" activo solo si cambió.
- Las citas que entran por WhatsApp se guardan con este valor.
