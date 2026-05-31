import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAuth, NOT_FOUND, UNAUTHORIZED } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: { planId: string } },
) {
  const auth = await getAuth();
  if (!auth) return UNAUTHORIZED;

  const plan = await prisma.paymentPlan.findFirst({
    where: { id: params.planId, tenantId: auth.tenantId },
  });
  if (!plan) return NOT_FOUND;

  await prisma.$transaction([
    prisma.paymentPlanInstallment.updateMany({
      where: { planId: params.planId, status: "pending" },
      data: { status: "cancelled" },
    }),
    prisma.paymentPlan.update({
      where: { id: params.planId },
      data: { status: "cancelled" },
    }),
  ]);

  revalidatePath(`/clientes/${plan.customerId}`);
  revalidatePath("/cuotas");

  return NextResponse.json({ ok: true });
}
