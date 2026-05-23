# audit

Audita el estado del harness: hooks configurados, skills disponibles, permisos activos, y log de actividad reciente.

## Usage
`/audit`

## Instructions

Run the following checks and report results in a structured summary:

1. **Settings**: Read `.claude/settings.json`. Report: model, number of allow/deny permissions, hooks configured (names and matchers).
2. **Skills**: List all `.md` files in `.claude/commands/`. Show name and first line of each.
3. **Hook implementations**: List all `.ts` files in `src/hooks/`. Check that files referenced in settings.json actually exist.
4. **Activity log**: If `.claude/logs/hooks.jsonl` exists, show the last 10 entries formatted as a table: timestamp | event | tool | session_id.
5. **TypeScript**: Run `npx tsc --noEmit` and report pass/fail.

Format the output as a clear report with sections. Highlight any missing files or misconfigurations.
