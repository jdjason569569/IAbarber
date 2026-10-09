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
