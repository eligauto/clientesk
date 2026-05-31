import { NextResponse } from "next/server";
import { getAuth, NOT_FOUND, UNAUTHORIZED } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { planId: string } },
) {
  const auth = await getAuth();
  if (!auth) return UNAUTHORIZED;

  const plan = await prisma.paymentPlan.findFirst({
    where: { id: params.planId, tenantId: auth.tenantId },
    include: {
      customer: { select: { id: true, name: true } },
      installments: { orderBy: { installmentNumber: "asc" } },
    },
  });

  if (!plan) return NOT_FOUND;
  return NextResponse.json(plan);
}
