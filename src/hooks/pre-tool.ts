#!/usr/bin/env node
/**
 * PreToolUse hook — runs before every tool call.
 * Exit 0 = proceed, exit 2 = block with message.
 *
 * Receives JSON on stdin: { session_id, tool_name, tool_input }
 * To block: write {"decision": "block", "reason": "..."} to stdout and exit 2.
 */
import { log } from "./logger.js";
import type { HookContext } from "./types.js";

async function main() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const ctx: HookContext = JSON.parse(Buffer.concat(chunks).toString());

  log("pre_tool", { tool: ctx.tool_name, session: ctx.session_id });

  // ── Guards ────────────────────────────────────────────────────────────────
  // Example: block destructive git commands
  if (ctx.tool_name === "Bash") {
    const cmd = (ctx.tool_input.command as string) ?? "";
    if (/git\s+push\s+--force/.test(cmd)) {
      process.stdout.write(
        JSON.stringify({ decision: "block", reason: "Force push bloqueado por harness." })
      );
      process.exit(2);
    }
  }

  // Default: approve
  process.exit(0);
}

main().catch((e) => {
  process.stderr.write(String(e));
  process.exit(0); // never block Claude due to hook errors
});
