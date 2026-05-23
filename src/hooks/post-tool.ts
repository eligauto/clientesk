#!/usr/bin/env node
/**
 * PostToolUse hook — runs after every tool call.
 * Only for logging/side-effects; exit code is ignored.
 *
 * Receives JSON on stdin: { session_id, tool_name, tool_input, tool_response }
 */
import { log } from "./logger.js";
import type { PostToolContext } from "./types.js";

async function main() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const ctx: PostToolContext = JSON.parse(Buffer.concat(chunks).toString());

  const isError = ctx.tool_response?.is_error === true;
  log("post_tool", {
    tool: ctx.tool_name,
    session: ctx.session_id,
    error: isError,
  });
}

main().catch(() => {}); // silent — never disrupt Claude
