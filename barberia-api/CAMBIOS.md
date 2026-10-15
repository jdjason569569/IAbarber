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
