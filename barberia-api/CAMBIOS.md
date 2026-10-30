# Change log – BarberIA API

This file records, in chronological order, every change made to the backend.

## Stack

| Piece | Version |
|---|---|
| NestJS | 12.x |
| TypeScript | 6.0 |
| Node / npm | 24.21 / 11.19 |

---

## 2026-10-13 · Project creation

**What was done**
- Generated with `npx @nestjs/cli new barberia-api --skip-git --skip-tests --package-manager npm --strict`, as a sibling of `barberia-app/`.
- Removed the testing setup (Vitest configs, test scripts and test dependencies) following the project's no-unit-tests rule.
- `src/main.ts`: enabled CORS so the Ionic app can call the API.
- Added `.gitignore` and replaced the default README.

**Current state**
- Only the default `GET /` endpoint ("Hello World!"). `npm run build` passes.

**Pending / notes**
- No modules, models or database yet.

---

## 2026-10-14 · Project skill: hexagonal architecture

**What was done**
- Added `.claude/skills/hexagonal-architecture/SKILL.md`: module-based folder structure (`domain`, `application`, `infrastructure`), inward dependency rule, ports and adapters, per-layer rules and naming conventions.

**Current state**
- The skill defines the target architecture; the code still has only the default Nest starter files (`app.module.ts`, `app.controller.ts`, `app.service.ts`).

**Pending / notes**
- Skills `english-only`, `no-unit-tests` and `log-changes` exist only in `barberia-app/.claude/skills/` and are not yet available in this project.

---

## 2026-10-14 · Applied hexagonal architecture

**What was done**
- Removed the default Nest starter files (`app.controller.ts`, `app.service.ts`).
- Added `src/modules/appointments/` (domain: `Appointment` entity, status, `InvalidAppointmentError`, `AppointmentRepository` port; application: list and schedule use cases and DTOs; infrastructure: in-memory repository, HTTP controller; module wiring via the `APPOINTMENT_REPOSITORY` token).
- Added `src/modules/statistics/` (domain: summary types and `StatisticsRepository` port; application: `GetStatisticsUseCase`; infrastructure: in-memory repository and controller).
- Added `src/shared/errors/domain.error.ts` as the base domain error.
- `src/app.module.ts` now only imports the two feature modules.

**Current state**
- Endpoints: `GET /appointments`, `POST /appointments`, `GET /statistics`, backed by in-memory mock data matching the Ionic app. `npm run build` passes and the endpoints were checked manually.
- Layer rule verified: `domain` has no Nest imports and `application` does not import `infrastructure`.

**Pending / notes**
- Real persistence adapter (database) still to be chosen; swap it in the module providers without touching domain or application.
- No input validation library yet; the controller does minimal coercion and relies on domain rules.
- The Ionic app still uses its own mock data and is not connected to this API.

---

## 2026-10-14 · Supabase persistence and voice assistant module

**What was done**
- Appointments now carry `serviceCost` and `extras`; the repository port dropped `nextId()` (`save` returns the stored entity) and gained `findById`.
- Added `SupabaseAppointmentRepository` (`@supabase/supabase-js`), used when `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set; otherwise the in-memory repository is used.
- Added `PATCH /appointments/:id/status` (`UpdateAppointmentStatusUseCase`, 404 via `AppointmentNotFoundError`).
- New `assistant` module: `LlmPort`, `DeepseekLlmAdapter`, `HandleVoiceCommandUseCase` and `POST /assistant/command`. Tools: `create_appointment`, `list_appointments`, `cancel_appointment` (cancel needs a confirmation round-trip with `confirmCancelId`).
- `src/env.ts` loads `.env`; added `.env.example` and `docs/schema.sql`.

**Current state**
- `npm run build` and lint pass. Appointment endpoints verified with curl against the in-memory repository; the LLM call was not run (no `DEEPSEEK_API_KEY`).

**Pending / notes**
- Create the table with `docs/schema.sql` and fill `.env`.
- Service catalog and barbers are hardcoded in `modules/assistant/domain/catalog.ts`.

---

## 2026-10-14 · Guided booking dialog

**What was done**
- Added `POST /assistant/booking` (`HandleBookingTurnUseCase`): stateless turn-based dialog. The client sends `{ text, draft }`; the API fills the draft from the answer (DeepSeek tool `fill_booking`), validates it, asks the next missing question (client → date → time → service) and creates the appointment when complete.
- Draft values are sanitized (ISO date, `HH:mm`, service must exist in the catalog) before use.

**Current state**
- Build and lint pass; first-turn question and final creation verified with curl. The LLM step was not run (no `DEEPSEEK_API_KEY`).

**Pending / notes**
- Barber is not asked; the first barber in the catalog is used.

---

## 2026-10-15 · LLM provider: DeepSeek → Claude

**What was done**
- Replaced `DeepseekLlmAdapter` with `ClaudeLlmAdapter` (official `@anthropic-ai/sdk`) behind the same `LlmPort`; no use case changed.
- Model comes from `ANTHROPIC_MODEL` (default `claude-opus-5-5`), `effort: low` for short voice turns; a `refusal` stop reason is answered with a polite message.
- Env: `ANTHROPIC_API_KEY` replaces `DEEPSEEK_API_KEY` (`.env.example` updated).

**Current state**
- Build and lint pass. The Claude call was not run (no key configured).

---

## 2026-10-15 · LLM provider: Claude → Gemini

**What was done**
- Replaced `ClaudeLlmAdapter` with `GeminiLlmAdapter` (REST `generateContent` with function calling) behind the same `LlmPort`; removed `@anthropic-ai/sdk`.
- Env: `GEMINI_API_KEY` (free key from Google AI Studio) and optional `GEMINI_MODEL` (default `gemini-3.8-flash`); `.env.example` updated.
- Parameterless tools (`abort_booking`) omit `parameters` because Gemini rejects empty object schemas.

**Current state**
- Build and lint pass. The Gemini call was not run (no key configured).

---

## 2026-10-17 · Mock data removed

**What was done**
- `InMemoryAppointmentRepository` no longer ships seed appointments (starts empty).
- Removed `InMemoryStatisticsRepository` (hardcoded numbers). New `AppointmentStatisticsRepository` computes the summary from stored appointments of the current month: count and revenue (cancelled excluded), new clients, cancellation rate, top services, per-barber totals. `StatisticsModule` now imports `AppointmentsModule`.

**Current state**
- Build and lint pass. Verified with curl on a fresh instance: empty data gives zeros; two appointments (one cancelled) give 1 appointment, $20 revenue, 2 new clients, 50% cancellation.

**Pending / notes**
- The service catalog and barbers in `modules/assistant/domain/catalog.ts` are still fixed in code (configuration, not mock data).

---

## 2026-10-19 · Modelo Gemini por defecto más rápido

**Qué se hizo**
- `gemini-llm.adapter.ts`: el modelo por defecto pasa de `gemini-3.8-flash` a `gemini-3.5-flash-lite`. El anterior tardaba más de 40 s en responder y la app corta a los 20 s, así que el asistente fallaba al agendar.

---

## 2026-10-19 · Appointment validations (single barber)

**What was done**
- No two active appointments may share a date and time (cancelled ones free the slot). Checked in `ScheduleAppointmentUseCase` and `UpdateAppointmentStatusUseCase` (reopening a cancelled appointment) via the new port method `findActiveAt`; `POST` / `PATCH` answer `409 Conflict`.
- Past appointments are rejected (`AppointmentInPastError`, 400); the entity now rejects non-existent dates (`2027-02-30`) and invalid times.
- Database guard: partial unique index `appointments_active_slot_unique` on `(date, time) where status <> 'cancelled'` in `docs/schema.sql`; the Supabase repository maps error `23505` to the same conflict error (covers concurrent bookings).
- Voice dialog: on a taken slot it keeps the answers and asks only for another time; for a past date it asks the date again.
- `BARBERS` in the catalog reduced to `Carlos` (the shop has one barber).

**Current state**
- Build and lint pass. Verified with curl on a fresh instance: duplicate slot → 409, past → 400, invalid date/time → 400, cancel then rebook works, reopening into a taken slot → 409, voice draft with a taken slot asks for another time.

**Pending / notes**
- Run the new index statement from `docs/schema.sql` in Supabase when the table already exists.
- Not done yet: opening hours and service duration (overlaps), valid status transitions.

---

## 2026-10-20 · Configurable services

**What was done**
- New `services` module (hexagonal): `BarberService` entity (name up to 60 chars, price 0–100000), `ServiceRepository` port with in-memory and Supabase adapters, use cases `ListServices` / `AddService` / `RemoveService` and `GET|POST /services`, `DELETE /services/:id` (409 duplicate name ignoring case, 400 invalid, 404 unknown).
- The assistant now reads services from `ListServicesUseCase` instead of the hardcoded `SERVICE_CATALOG` (removed from `catalog.ts`; only `BARBERS` remains). With no services the voice dialog answers that they must be added in Settings.
- `docs/schema.sql`: `services` table with a unique index on `lower(name)`.

**Current state**
- Build and lint pass. Verified with curl on a fresh instance: empty list, add, duplicate (409), negative/blank/non-numeric (400), delete, delete unknown (404); voice dialog with no services, with services, and a draft with a non-existent service being discarded.

**Pending / notes**
- Run the `services` block of `docs/schema.sql` in Supabase when using it.
- The in-memory repository starts empty: add services from the app after every backend restart (until Supabase is configured).
- Services cannot be edited yet (delete and re-add to change a price).

---

## 2026-10-20 · Statistics totals return stable keys

**What was done**
- `GET /statistics`: each total now has `key` (`appointmentsThisMonth`, `revenueThisMonth`, `newClients`, `cancellationRate`) instead of an English `label`, so clients translate it. Barbers without an assigned barber return an empty `name` (was `"Unassigned"`).

**Current state**
- Build and lint pass; verified with curl.

**Pending / notes**
- The voice assistant replies are hardcoded in Spanish in the use cases; they could move to a message catalog like the app's.

---

## 2026-10-20 · `barber` field removed

**What was done**
- Removed `barber` from the appointment entity, DTOs, request, controller, in-memory and Supabase repositories, and from the voice assistant (tool parameter, prompt and booking). Deleted `modules/assistant/domain/catalog.ts` (only held `BARBERS`).
- Statistics: removed the per-barber summary (`barbers`) from `GET /statistics`.
- `docs/schema.sql`: the `barber` column is no longer created, and a migration `alter table appointments drop column if exists barber;` was added at the end.

**Current state**
- Build and lint pass. Verified in an in-memory instance (create without `barber`, a sent `barber` is ignored, 409 on a taken slot, statistics without `barbers`) and reading real Supabase data with the new code while the column still exists.

**Pending / notes**
- Run the migration statement in the Supabase SQL Editor to drop the column. Until then it is harmless: the column has a default `''` and the API no longer reads or writes it.

---

## 2026-10-23 · Cancel flag instead of status

**What was done**
- The appointment `status` (pending / confirmed / completed / cancelled) was replaced by the boolean flag `cancelled` (`true` = cancelled, `false` = active). Appointments are never deleted: cancelling only flips the flag.
- `PATCH /appointments/:id/status` became `PATCH /appointments/:id/cancelled` with `{ "cancelled": boolean }` (`SetAppointmentCancelledUseCase`): idempotent, 404 for an unknown id, 400 for a non-boolean, 409 when reactivating into a slot that is taken. Cancelled appointments free their slot.
- Updated the entity, DTO, in-memory and Supabase repositories (`findActiveAt` filters `cancelled = false`), statistics and the voice assistant. Removed `appointment-status.ts`.
- `docs/schema.sql`: new table definition with `cancelled boolean not null default false`, the unique index now `where not cancelled`, and an idempotent migration block that converts `status` into `cancelled` and drops `status`.

**Current state**
- Build and lint pass. Verified in an in-memory instance: create, cancel (stays in the list with `true`), cancel twice, slot freed, reactivate into a taken slot (409), invalid value (400), unknown id (404) and statistics. Not run against Supabase yet.

**Pending / notes**
- **Run the migration block of `docs/schema.sql` in the Supabase SQL Editor before using the new backend**: until the `cancelled` column exists, creating and listing appointments against Supabase fails.
- The states confirmed / completed no longer exist.

---

## 2026-10-27 · Business hours per weekday

**What was done**
- New `business-hours` module (domain `WeeklyHours`, Supabase and in-memory repositories, use cases `GetBusinessHours` / `UpdateBusinessHours`).
- `GET /business-hours`: returns the 7 weekdays (`weekday` 0 = Sunday … 6 = Saturday, `open`, `openHour`, `closeHour`; 24 = midnight). Weekdays never configured use the default hours, 07:00 to midnight.
- `PUT /business-hours`: saves the list of weekdays. Returns 400 for an invalid hour or when opening is not before closing.
- `ScheduleAppointmentUseCase` rejects appointments outside business hours (`OutsideBusinessHoursError` → 400).
- Voice assistant: a closed day gets "Ese día no atendemos. ¿Para qué otra fecha?". A time outside the hours gets "Ese día atendemos de X a Y. ¿A qué otra hora?". In both cases the rest of the answers is kept.
- `docs/schema.sql`: `business_hours` table.

**Pending / notes**
- `business_hours` table created in Supabase (migration `create_business_hours`, RLS enabled). Pending: deploy the API to Render.

---

## 2026-10-28 · Unavailable hours for a date (day blocks)

**What was done**
- `business-hours` module: domain `DayBlocks` (whole-hour blocks, start before end, no overlaps), `DAY_BLOCKS_REPOSITORY` (Supabase + in-memory), use cases `GetDayBlocks` / `SaveDayBlocks`.
- `GET /business-hours/blocks/:date` returns `[{ fromHour, toHour }]` for a `YYYY-MM-DD` date.
- `PUT /business-hours/blocks/:date` replaces the blocks of that date. It returns 400 for invalid or overlapping blocks. It returns 409 with `{ message, appointments }` when active appointments fall inside the blocks; nothing is saved in that case.
- The controller and `UpdateDayBlocksUseCase` live in the `appointments` module, because saving must check the appointments. This avoids a circular module import.
- `ScheduleAppointmentUseCase` and reactivating a cancelled appointment reject blocked times (`BarberUnavailableError` → 400).
- Voice assistant: a blocked time gets "De X a Y no hay disponibilidad. ¿A qué otra hora?" and keeps the other answers.
- `docs/schema.sql`: `unavailable_slots` table.

**Pending / notes**
- Create the `unavailable_slots` table in Supabase (SQL at the end of `docs/schema.sql`). Until then the new endpoints and scheduling fail with 500.
- The weekly hours (`/business-hours`) are still enforced, but the app no longer edits them.

---

## 2026-10-28 · "Today" follows the shop's time zone, not UTC

**What was done**
- Bug: at 9 pm on Oct 27 in Bogotá, the assistant said the day had already passed. Render runs in UTC (already 02:00 on Oct 28), and `toISOString()` and the server's local time gave the UTC date.
- `src/env.ts` sets `process.env.TZ = SHOP_TIMEZONE || 'America/Bogota'`. Every `Date` in the API now uses the shop's clock. This covers the "past appointment" check in `ScheduleAppointmentUseCase` and the "past date" check in the assistant.
- New `src/shared/utils/local-date.ts` (`localIsoDate`). It replaces the copy in `HandleBookingTurnUseCase` and `toISOString().slice(...)` in the booking and voice-command prompts (the "today" date sent to the LLM) and in the monthly statistics.

**Pending / notes**
- Deploy the API to Render. Optional: set `SHOP_TIMEZONE` if the shop is not in Bogotá's time zone.

---

## 2026-10-28 · Walk-in clients ("Cliente casual") push today's agenda back 30 minutes

**What was done**
- New `walkIn` flag on `Appointment` (column `walk_in`). Walk-ins are stored as client "Cliente casual", today, at the current time. They skip the past, business-hours, block and slot checks, and they do not hold a slot of the agenda.
- New `RegisterWalkInUseCase`. It saves the walk-in, finds the first active booking of today whose hour overlaps the walk-in's 30 minutes, and moves that booking and every later one today 30 minutes later. Bookings are saved latest first so the unique index never clashes. It reports which moved bookings fall outside hours or inside a block, and which could not move (past midnight).
- Booking assistant: `BookingDraft.walkIn`. With it, the assistant only asks for the service (never the name, date or time), then calls `RegisterWalkInUseCase` and lists the moved bookings in its reply.
- Bookings can now start at :30, so slot conflicts use overlap: `Appointment.clashesWith` (active, non walk-in, same day, less than 60 min apart). It applies when scheduling and when reactivating a cancelled appointment.
- Statistics: walk-ins count as appointments and revenue, but not as new clients.

**Pending / notes**
- Run the new migration in Supabase (`walk_in` column and the updated `appointments_active_slot_unique` index, in `docs/schema.sql`). Until then, every save fails because the column does not exist.
- Clients whose booking moved are not notified (the app does not store phone numbers).

---

## 2026-10-28 · "Completed" appointments

**What was done**
- New `completed` flag on `Appointment` (column `completed`): the barber confirms the service was done. `withCompleted` rejects cancelled appointments, and `withCancelled(true)` rejects completed ones (`InvalidAppointmentError` → 400).
- New `SetAppointmentCompletedUseCase` and `PATCH /appointments/:id/completed` with body `{ completed: boolean }`, same pattern as `/cancelled`.
- Statistics: monthly revenue only adds completed appointments. "Appointments this month" and top services are unchanged.

**Pending / notes**
- Run the `completed` migration in Supabase (`docs/schema.sql`) before deploying. Until then, every save fails.
- Revenue for the current month drops to $0 until appointments are marked completed. Older appointments are not completed automatically.

---

## 2026-10-28 · Reactivating walk-ins

**What was done**
- `SetAppointmentCancelledUseCase`: reactivating a walk-in skips the block and slot checks, since walk-ins hold no slot. The app now offers undo for cancel (`cancelled: false`) and complete (`completed: false`) with the existing endpoints.

---

## 2026-10-29 · Se quitan los servicios: el asistente pregunta el precio

**Qué se hizo**
- Se eliminó el módulo `services` completo (catálogo, endpoints `/services`, use cases y repositorios).
- El asistente ya no pregunta qué servicio quiere el cliente. Pregunta **"¿Cuánto cuesta el servicio?"** y el LLM convierte lo que dice el barbero en un número ("quince mil" → 15000). `BookingDraft.service` pasa a ser `price` y el paso `service` pasa a ser `price`. Cliente casual solo pide el precio.
- El precio se guarda en `serviceCost`. Se quitó `service` de `Appointment`, de los DTOs, del request `POST /appointments`, del walk-in y de los repositorios (Supabase y memoria).
- El comando de voz (`/assistant/command`) recibe `price` en vez de `service`.
- Estadísticas: se quitó `topServices`.
- `docs/schema.sql`: se quitó `service` y la tabla `services`, y se agregó una migración que hace `drop column service` y `drop table services`.

**Pendiente / notas**
- Primero hay que desplegar este API en Render y **después** correr la migración. Si se hace al revés, el API viejo deja de poder crear citas.

---

## 2026-10-29 · Editar nombre y precio de una cita

**Qué se hizo**
- Nuevo `PATCH /appointments/:id` con body `{ client, serviceCost }` para corregir el nombre del cliente o el precio de cualquier cita, también de las casuales y en cualquier estado.
- `Appointment.withDetails(client, serviceCost)` valida que el nombre no esté vacío y que el precio sea un número mayor o igual a 0 (`InvalidAppointmentError` → 400). `UpdateAppointmentUseCase` responde 404 si la cita no existe.
- No cambia la fecha, la hora ni los extras. Tampoco hace falta migración.

---

## 2026-10-29 · Asistente: todas las respuestas en una sola petición

**Qué se hizo**
- `POST /assistant/booking` acepta `answers` (`client`, `date`, `time`, `price`, cada uno el texto que dijo o escribió el usuario). Con `answers` se hace **una sola llamada a Gemini**: el mensaje lleva una línea con su etiqueta por respuesta y usa un prompt propio (`buildAnswersPrompt`).
- Las validaciones no cambian (fecha pasada, día cerrado, horario, bloqueos, nombre repetido, choque de hora). Si algo falla, devuelve `asking` con el `draft` sin ese dato y la pregunta para repetirlo.
- Si una respuesta llegó pero no se pudo interpretar, el mensaje empieza con "No te he entendido.".
- Se sigue aceptando `text` para que las versiones anteriores de la app sigan funcionando.

**Pendiente / notas**
- Desplegar en Render antes de instalar la nueva versión de la app.

---

## 2026-10-29 · Fotos del cliente con cada corte (FLUX.1 Kontext en Hugging Face)

**Qué se hizo**
- Nuevo módulo `haircut-preview` con `POST /haircut-preview`. Recibe `{ photo, haircutId }` (la foto como data URL base64) y responde `{ image }` con la foto del cliente con ese corte.
- Puerto `HairstyleEditor` con el adaptador `FluxKontextHairstyleEditor`, que usa `@gradio/client` para llamar a la Space gratuita `black-forest-labs/FLUX.1-Kontext-Dev` (ZeroGPU). La instrucción pide cambiar solo el pelo y mantener la cara, la barba, la ropa y el fondo (`domain/entities/haircut-style.ts`).
- Errores: corte desconocido o foto inválida → 400. Space caída, ocupada, sin cuota o más de 150 s → 503.
- `main.ts`: el límite del body JSON sube a 12 MB para que quepa la foto.
- La foto no se guarda.

**Pendiente / notas**
- Variables opcionales: `HF_TOKEN` (token gratuito de Hugging Face; sin él la cuota anónima de GPU alcanza solo para pocas imágenes al día) y `HAIRCUT_PREVIEW_SPACE` (otra Space compatible).
- Se probó Gemini (`gemini-*-image`): con la key del plan gratuito da 429 porque la cuota es 0. HairFastGAN tampoco sirve: la Space oficial depende de un servidor externo que no responde.
- Desplegar en Render antes de instalar la nueva versión de la app.

---

## 2026-10-30 · Haircut recommendations from the catalog in Supabase (replaces the AI preview)

**What was done**
- Removed the `haircut-preview` module (FLUX.1 Kontext on Hugging Face) and the `@gradio/client` dependency. `main.ts` is back to the default JSON body limit.
- New module `haircut-advisor` with `POST /haircut-recommendations`. It receives `{ metrics }` (the four face proportions measured on the phone, no photo) and responds `{ faceShape, recommendations }`: the shape with its probability ranking, and the top 5 cuts with `name`, `description`, `score` and `images`.
- The face shape classifier moved from the app to `domain/entities/face-shape.entity.ts`; the ranking is in `domain/entities/haircut.entity.ts`. Invalid metrics → 400.
- Port `HaircutCatalogRepository` with `SupabaseHaircutCatalogRepository` (table `haircuts`; example pictures listed from the public Storage bucket `haircut-images/<cut id>/`) and `InMemoryHaircutCatalogRepository` (default catalog, no pictures) when Supabase is not configured.
- `docs/schema.sql`: table `haircuts` seeded with the 9 cuts, and the `haircut-images` bucket.

**Current state**
- Tested with the in-memory catalog: a round face gets pompadour/quiff first, an oblong face gets fringe first.

**Pending / notes**
- Run the new block of `docs/schema.sql` on Supabase; until then the endpoint answers 500 ("Could not find the table 'public.haircuts'").
- Upload example pictures (jpg, png or webp) to `haircut-images/<cut id>/`. New cuts are rows in `haircuts`; no deploy needed.
- `HF_TOKEN` in `.env` is no longer used.
- Deploy to Render before installing the new app version.

## 2026-10-30 · Haircut catalog created in Supabase

**What was done**
- Applied the haircut-advisor block of `docs/schema.sql` to Supabase (migration `create_haircuts_catalog`): `haircuts` table with the 9 cuts and the public `haircut-images` bucket. Without it `POST /haircut-recommendations` returned 500 and the app showed "No se pudieron obtener los cortes recomendados".

**Current state**
- `POST /haircut-recommendations` responds 200 with the face shape and ranked cuts.

**Pending / notes**
- The bucket is empty: cuts show the placeholder until pictures are uploaded to `haircut-images/<cut id>/`.
