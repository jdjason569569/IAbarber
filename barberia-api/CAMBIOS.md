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
