---
name: centralize-messages
description: Every text the user can see must live in the central i18n catalog (Spanish), never hardcoded in templates or components. Use whenever adding or changing any label, title, placeholder, button, empty/loading/error message, alert, toast, aria-label or status text, and whenever a new page or feature is created.
---

# Centralize user-facing messages

The app UI is in **Spanish** and every visible text comes from one catalog. Never write a user-visible string directly in a template or component.

## Where things live
| Piece | File |
|---|---|
| Catalog (Spanish values, English keys) | `src/app/core/i18n/messages.es.ts` (`MESSAGES_ES`, type `MessageKey`) |
| Lookup service | `src/app/core/i18n/i18n.service.ts` (`I18nService.t(key, params?)`, `speechLocale`) |
| Template pipe | `src/app/shared/pipes/translate.pipe.ts` (`TranslatePipe`, name `t`) |

## Rules
1. **New or changed text → add the key to `MESSAGES_ES` first**, grouped by feature (`appointments.*`, `settings.*`, `assistant.errors.*`, ...). Keys are English, `feature.thing` or `feature.group.thing`; values are Spanish.
2. **Templates**: import `TranslatePipe` in the component and use `{{ 'settings.title' | t }}`. For attributes use property binding: `[label]="'settings.name' | t"`, `[placeholder]="..."`, `[attr.aria-label]="... | t"`.
3. **Components/services**: inject `I18nService` and call `this.i18n.t('key')`. Alerts, toasts and error signals hold the **translated** text.
4. **Dynamic values**: use `{name}` placeholders and pass params: `t('settings.deleteMessage', { name })`. Never concatenate translated fragments.
5. **Keys must be type-safe**: the pipe and `t()` only accept `MessageKey`. When a key is built dynamically (statuses, totals), use a small typed helper (``this.i18n.t(`status.${status}` as MessageKey)`` or `satisfies MessageKey`), not a raw string.
6. **Never show raw API or exception messages to the user.** Map the HTTP status or an error code to a catalog key (see `messageFrom` in the settings page and `assistantErrorKey` in the appointment list page). Add a `VoiceError`-style code for new failure types.
7. **API data that is a label** (for example statistics totals) must arrive as a stable key from the backend (`revenueThisMonth`) and be translated in the front (`statistics.totals.revenueThisMonth`).
8. Reuse an existing key when the text is the same; do not duplicate values under new keys.

## Stays in English (code, not user-visible)
Identifiers, code comments, `console.*` logs and thrown `Error` messages that are never displayed (see the `english-only` skill). Texts produced by the backend voice assistant (`reply`) are Spanish and come from the API; they are shown as received.

## Before finishing a UI change
- Search the templates and components you touched for hardcoded words (`grep -rnE ">[^<{@]*[A-Za-z]{4,}" src/app --include=*.html`) and move any to the catalog.
- Run `npx ng build --configuration development`; a missing or misspelled key fails the strict template check.
- Log the change in `CAMBIOS.md`.

## Adding another language later
Create `messages.<lang>.ts` with the same keys (type it as `Record<MessageKey, string>`), and let `I18nService` pick the catalog by locale. Components and templates need no change if they follow these rules.
