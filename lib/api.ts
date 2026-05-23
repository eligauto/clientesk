import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

type Handler = (req: Request, tenantId: string) => Promise<Response>;

/**
 * Wraps a route handler enforcing auth and injecting tenantId.
 * Usage: export const GET = withTenant(async (req, tenantId) => { ... })
 */
export function withTenant(handler: Handler) {
  return async (req: Request): Promise<Response> => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: "No autorizado", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }
    return handler(req, session.user.tenantId);
  };
}
