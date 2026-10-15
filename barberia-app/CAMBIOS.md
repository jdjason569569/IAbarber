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
