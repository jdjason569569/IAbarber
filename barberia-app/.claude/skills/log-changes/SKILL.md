---
name: log-changes
description: Always record every change, advance or decision made in this project in CAMBIOS.md. Use after any code, config, dependency or architecture change, and before finishing any task that modified the project.
---

# Log changes in CAMBIOS.md

Every time you modify the project, you MUST add an entry to `CAMBIOS.md` (project root) before finishing the task.

## When to log
- Files created, edited, renamed or deleted
- Dependencies added, removed or upgraded
- Configuration changes (Capacitor, Angular, Ionic, environment)
- Architecture or technology decisions
- Commands the user will need to run as a result of the change

## Entry format
Append at the end of the file, separated by `---`:

```markdown
---

## YYYY-MM-DD · Short title

**What was done**
- Bullet list of the concrete changes (mention file paths)

**Current state**
- What works now / what is still missing

**Pending / notes**
- Open points, follow-ups, caveats (omit if none)
```

## Rules
- Never rewrite or delete previous entries; only append.
- Use the real current date.
- Write entries in English (see the `english-only` skill).
- Keep entries short and factual; do not paste large code blocks.
- If a task changed nothing, do not add an entry.
