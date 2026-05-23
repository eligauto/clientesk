import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function getTenantId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) throw new Error("Unauthorized");
  return session.user.tenantId;
}
