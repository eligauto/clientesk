import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

type Handler = (req: Request, tenantId: string) => Promise<Response>;

/** For routes without dynamic params — wraps and injects tenantId. */
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

/** For routes with dynamic params — call at the top of each handler. */
export async function getAuth(): Promise<{ tenantId: string } | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) return null;
  return { tenantId: session.user.tenantId };
}

export const UNAUTHORIZED = NextResponse.json(
  { error: "No autorizado", code: "UNAUTHORIZED" },
  { status: 401 }
);

export const NOT_FOUND = NextResponse.json(
  { error: "No encontrado", code: "NOT_FOUND" },
  { status: 404 }
);
