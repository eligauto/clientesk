# scaffold

Scaffolds a new module or feature in this harness project.

## Usage
`/scaffold <module-name> [hook|skill|both]`

## What it does
1. If `hook`: creates `src/hooks/<module-name>.ts` extending the PreToolUse or PostToolUse pattern.
2. If `skill`: creates `.claude/commands/<module-name>.md` with the skill template.
3. If `both` (default): creates both.

## Instructions

The user wants to scaffold a new module named `$ARGUMENTS`.

Parse `$ARGUMENTS` as `<name> [hook|skill|both]`. Default type is `both`.

For a **hook**:
- Create `src/hooks/<name>.ts` with the same stdin-JSON pattern as `pre-tool.ts`.
- Export a typed `handle(ctx)` function.
- Import and call it from `pre-tool.ts` if it's a PreToolUse hook, or `post-tool.ts` if PostToolUse.

For a **skill**:
- Create `.claude/commands/<name>.md` with frontmatter: `# <name>`, a one-line description, `## Usage`, and `## Instructions`.

After creating files, show the user what was created and what they need to fill in.
