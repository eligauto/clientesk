import { appendFileSync, mkdirSync } from "fs";
import { join } from "path";

const LOG_DIR = join(process.cwd(), ".claude", "logs");

function ensureLogDir() {
  try {
    mkdirSync(LOG_DIR, { recursive: true });
  } catch {}
}

export function log(event: string, data: unknown) {
  ensureLogDir();
  const entry = JSON.stringify({
    ts: new Date().toISOString(),
    event,
    ...(typeof data === "object" && data !== null ? data : { data }),
  });
  appendFileSync(join(LOG_DIR, "hooks.jsonl"), entry + "\n");
}
