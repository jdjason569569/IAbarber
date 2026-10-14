---
name: no-unit-tests
description: Unit tests must NOT be implemented in this project. Use whenever writing or generating code, components, services or pipes, or when tempted to create *.spec.ts files, add test setups, or run the test suite.
---

# No unit tests

Do **not** implement unit tests in this project.

## Rules
- Do not create `*.spec.ts` files (no tests for components, services, pipes, guards, etc.).
- When generating Angular/Ionic artifacts with the CLI, skip the spec file (e.g. `ng generate component foo --skip-tests`).
- Do not add or configure testing libraries or runners (Jasmine, Karma, Jest, Vitest, Cypress, etc.).
- Do not offer, suggest or insist on adding tests; if the user asks why there are none, explain it is a project decision.
- Do not run `ng test` as part of validating a change; validate with `npx ng build` instead.

## Exception
- Only write tests if the user explicitly asks for them in the current request.
