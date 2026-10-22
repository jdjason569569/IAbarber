---
name: feature-architecture
description: Best practices and feature-based architecture for this Ionic + Angular project. Use whenever creating or modifying pages, components, services, routes, models or any new functionality, and when deciding where a file should live.
---

# Feature-based architecture and best practices

Organize code by **feature** (business domain), not by technical type.

## Folder structure

```
src/app/
├── core/                     # App-wide singletons, loaded once
│   ├── services/             # HTTP client wrapper, auth, storage
│   ├── interceptors/
│   ├── guards/
│   ├── config/               # API urls, constants
│   └── i18n/                 # Message catalog and I18nService (see centralize-messages)
├── shared/                   # Reusable, feature-agnostic code
│   ├── components/
│   ├── directives/
│   ├── pipes/                # TranslatePipe (`t`)
│   ├── models/
│   └── utils/
├── features/
│   └── <feature-name>/       # e.g. appointments, barbers, services, auth
│       ├── pages/            # Routed screens (smart components)
│       ├── components/       # Feature-only presentational components
│       ├── services/         # Feature state and API access
│       ├── models/           # Interfaces and types
│       ├── data/             # Mock data (until the NestJS API exists)
│       └── <feature>.routes.ts
├── app.component.ts
└── app.routes.ts             # Lazy-loads each feature's routes
```

## Dependency rules
- `features/*` may import from `core` and `shared`.
- `core` and `shared` must **never** import from `features`.
- A feature must **not** import from another feature. If two features need the same code, move it to `shared` (or `core`).
- Each feature exposes only what the router needs; keep internals private.

## Angular best practices
- Standalone components only (no NgModules).
- Lazy-load every feature with `loadChildren` / `loadComponent`.
- Use `ChangeDetectionStrategy.OnPush` and Angular signals for local state.
- Use `inject()` instead of constructor injection.
- Smart components (pages) fetch data and hold state; presentational components receive `input()` and emit `output()`.
- Keep templates simple: no business logic, no heavy method calls; use `computed()` or pipes.
- Use `@if`, `@for` (with `track`) and `@switch` control flow.
- Prefer typed reactive forms; never use `any`.
- Unsubscribe automatically (`takeUntilDestroyed`, `async` pipe or `toSignal`).

## Data access
- Components never call `HttpClient` directly; go through a feature service.
- The feature service depends on an abstraction so mock data can be swapped for the real NestJS API without touching components.
- Define request/response models as interfaces in the feature's `models/`.

## Ionic best practices
- Use Ionic components (`ion-*`) and theme through CSS variables in `src/theme/variables.scss`.
- Use `ion-list` with `@for` and `track` for lists; use `ion-infinite-scroll` for long lists.
- Keep platform-specific code behind Capacitor plugins, wrapped in a `core` service.

## Naming conventions
- Files: `kebab-case` with type suffix (`appointment-list.page.ts`, `barber.service.ts`, `appointment.model.ts`).
- Classes: `PascalCase`; selectors prefixed with `app-`.
- One component/service/model per file.

## Creating a new feature
1. Create `features/<name>/` with the subfolders above (only the ones needed).
2. Add `<name>.routes.ts` and lazy-load it from `app.routes.ts`.
3. Generate files with the CLI using `--skip-tests` (see `no-unit-tests`).
4. Log the change in `CAMBIOS.md` (see `log-changes`).
5. Write all code in English (see `english-only`); user-visible text is Spanish and goes in the i18n catalog (see `centralize-messages`).
