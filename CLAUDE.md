# clientesk harness

**Proyecto:** SaaS PWA mobile-first para gestión de clientes, proveedores, ventas, compras y pagos parciales. Orientado a vendedores de herramientas que operan con ferreterías y talleres.  
**PRD completo:** [`PRD.md`](./PRD.md) — leerlo antes de cualquier decisión de arquitectura o modelo de datos.

Stack: Next.js 14 (App Router) + Tailwind + Prisma + PostgreSQL (Railway) + NextAuth.js. Deploy: Vercel + Railway.

Este repositorio es también el harness de Claude Code que extiende el CLI con hooks TypeScript, skills personalizados, y configuración centralizada.

## Estructura

```
clientesk/
├── CLAUDE.md                    ← este archivo
├── .claude/
│   ├── settings.json            ← permisos, modelo, hooks registrados
│   ├── settings.local.json      ← overrides locales (gitignored)
│   └── commands/                ← skills (slash commands)
│       ├── scaffold.md          ← /scaffold: crea nuevos módulos
│       └── audit.md             ← /audit: estado del harness
└── src/
    └── hooks/
        ├── types.ts             ← tipos compartidos (HookContext, PostToolContext)
        ├── logger.ts            ← logger append-only → .claude/logs/hooks.jsonl
        ├── pre-tool.ts          ← hook PreToolUse (puede bloquear tools)
        └── post-tool.ts         ← hook PostToolUse (solo logging/side-effects)
```

## Hooks

Los hooks se ejecutan en cada tool call de Claude. Están configurados en `.claude/settings.json`.

- **PreToolUse** (`src/hooks/pre-tool.ts`): recibe `{session_id, tool_name, tool_input}` por stdin. Exit 0 = aprobar, exit 2 + JSON en stdout = bloquear.
- **PostToolUse** (`src/hooks/post-tool.ts`): recibe además `tool_response`. El exit code se ignora.

Para agregar lógica: editar directamente `pre-tool.ts` o `post-tool.ts`, o crear un módulo separado en `src/hooks/` e importarlo.

## Skills

Los skills son archivos `.md` en `.claude/commands/`. Se invocan con `/nombre` en el chat.

- `/scaffold <nombre> [hook|skill|both]` — crea un nuevo hook o skill con la estructura correcta.
- `/audit` — reporta el estado del harness: configuración, logs recientes, typecheck.

## Setup

```bash
npm install
```

## Logs

Los hooks escriben a `.claude/logs/hooks.jsonl` (JSONL, una entrada por línea). Usar `/audit` para inspeccionar.

## Notas

- `settings.local.json` está gitignoreado — usarlo para API keys o configuración sensible.
- Los hooks nunca deben crashear Claude: los errores se tragan silenciosamente en `post-tool.ts` y se hace `exit 0` en `pre-tool.ts` ante excepciones.
