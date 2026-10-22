---
name: english-only
description: Write all source code in English: identifiers, file and folder names, code comments and docstrings. Use whenever writing or editing code in this project. It does not apply to the text shown to the user, which is Spanish and lives in the i18n catalog.
---

# Code in English

The user talks to you in Spanish, but **the code you write must be in English**.

## Must be in English
- Variable, function, class, interface, type, enum and constant names
- File and folder names
- Code comments and docstrings
- Message catalog keys (for example `settings.errors.duplicate`)
- Logs (`console.*`) and errors that are thrown but never shown to the user

## Not covered by this skill
- **Text shown to the user is Spanish.** It lives only in the i18n catalog (`src/app/core/i18n/messages.es.ts`); follow the `centralize-messages` skill. Never put it directly in templates or components.
- Chat replies to the user (Spanish).
- Documentation, `CAMBIOS.md` and commit messages: this skill does not require a language; keep the language the file already uses unless the user asks otherwise.

## Rules
- Do not write Spanish identifiers or comments, even for domain terms: use the English equivalent (`appointment`, not `cita`).
- If you touch code that has Spanish identifiers or comments, translate the parts you edit and mention it to the user.
