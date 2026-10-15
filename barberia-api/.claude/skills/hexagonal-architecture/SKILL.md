---
name: hexagonal-architecture
description: Hexagonal (ports and adapters) architecture for the BarberIA NestJS backend. Use whenever creating or modifying modules, entities, use cases, controllers, repositories, DTOs or any backend code, and when deciding where a file should live or what may import what.
---

# Hexagonal architecture (ports and adapters)

The domain and application logic must not depend on NestJS, HTTP, databases or any external tool. Those details live in adapters at the edges and plug in through ports.

## Folder structure

Organize by **module** (business domain); inside each module, by hexagon layer.

```
src/
├── modules/
│   └── <module-name>/                 # e.g. appointments, clients, barbers, statistics
│       ├── domain/                    # Pure business rules, zero framework imports
│       │   ├── entities/              # Entities and value objects
│       │   ├── errors/                # Domain errors
│       │   └── ports/                 # Interfaces the domain/application needs
│       ├── application/               # Use cases (one class per use case)
│       │   ├── use-cases/
│       │   └── dtos/                  # Plain input/output objects of the use cases
│       ├── infrastructure/            # Adapters (outside world)
│       │   ├── persistence/           # Repository implementations, ORM models, mappers
│       │   ├── http/                  # Controllers, request/response DTOs, validation
│       │   └── external/              # Third-party services (SMS, email, payments)
│       └── <module-name>.module.ts    # Wires ports to adapters (NestJS DI)
├── shared/                            # Cross-module building blocks (base errors, utils)
├── app.module.ts
└── main.ts
```

## Dependency rule

Dependencies always point **inward**: `infrastructure → application → domain`.

- `domain` imports nothing from `application`, `infrastructure`, NestJS, an ORM or any library (except plain language utilities).
- `application` imports only from `domain` (and `shared`).
- `infrastructure` may import from `application` and `domain`, and from frameworks.
- A module must **not** import another module's internals. If modules need to talk, expose a port or use an application-level interface; shared code goes in `shared`.
- Only `<module>.module.ts` may know both a port and its adapter.

## Ports and adapters

- **Inbound (driving) side**: controllers are adapters that call use cases. They translate HTTP into use-case input and use-case output into HTTP; they hold no business logic.
- **Outbound (driven) side**: the domain declares a **port** (an interface or abstract class in `domain/ports/`, e.g. `AppointmentRepository`). An adapter in `infrastructure/` implements it.
- Bind the port to the adapter in the module with an injection token, for example:
  ```ts
  providers: [
    { provide: APPOINTMENT_REPOSITORY, useClass: InMemoryAppointmentRepository },
  ]
  ```
  Use cases inject the **token**, never the concrete class.
- Start with in-memory adapters; swapping to a real database later must not touch domain or application code.

## Rules by layer

**Domain**
- Entities hold state and enforce invariants through methods; no public setters that bypass rules.
- Throw domain errors (`domain/errors/`), never `HttpException`.
- No decorators from NestJS, class-validator, TypeORM, etc.

**Application**
- One use case = one class = one `execute()` method, named after the business action (`schedule-appointment.use-case.ts`).
- Use cases orchestrate entities and ports; they never touch `Request`, `Response` or database clients.
- Input and output are plain DTOs, not entities and not ORM models.
- Use cases may carry `@Injectable()` only as a pragmatic DI marker; keep them free of other framework concerns.

**Infrastructure**
- Controllers: thin, validate input, call exactly one use case, map domain errors to HTTP status codes (exception filter or mapping).
- Persistence models are separate from domain entities; map between them with a mapper.
- Never leak ORM models or HTTP DTOs into `domain` or `application`.

## Naming conventions
- Files in `kebab-case` with a type suffix: `appointment.entity.ts`, `appointment.repository.ts` (port), `in-memory-appointment.repository.ts` (adapter), `schedule-appointment.use-case.ts`, `appointments.controller.ts`.
- Classes in `PascalCase`; ports named after the capability (`AppointmentRepository`), adapters prefixed with the technology (`InMemoryAppointmentRepository`, `TypeOrmAppointmentRepository`).
- One class per file.
- Never use `any`.

## Creating a new module
1. Create `src/modules/<name>/` with `domain/`, `application/`, `infrastructure/`.
2. Model entities and ports in `domain/` first, then the use cases, then the adapters.
3. Wire ports to adapters in `<name>.module.ts` and register the module in `app.module.ts`.
4. Generate files with `--no-spec` / skip tests; do not write unit tests unless the user asks.
5. Log the change in `CAMBIOS.md` (this project's change log).
6. Write everything in English.
