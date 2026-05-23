export interface HookContext {
  session_id: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
}

export interface PostToolContext extends HookContext {
  tool_response: {
    type: string;
    content?: string | unknown[];
    is_error?: boolean;
  };
}

export interface HookDecision {
  // "block" halts the tool, "approve" proceeds silently, "warn" logs but proceeds
  action: "block" | "approve" | "warn";
  reason?: string;
}
