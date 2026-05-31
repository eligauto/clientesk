import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAuth, NOT_FOUND, UNAUTHORIZED } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: { installmentId: string } },
) {
  const auth = await getAuth();
  if (!auth) return UNAUTHORIZED;

  const installment = await prisma.paymentPlanInstallment.findFirst({
    where: { id: params.installmentId, tenantId: auth.tenantId },
  });
  if (!installment) return NOT_FOUND;

  await prisma.paymentPlanInstallment.update({
    where: { id: params.installmentId },
    data: { status: "paid" },
  });

  // Si todas las cuotas del plan están pagadas o canceladas → completar el plan
  const remaining = await prisma.paymentPlanInstallment.count({
    where: { planId: installment.planId, status: "pending" },
  });
  if (remaining === 0) {
    await prisma.paymentPlan.update({
      where: { id: installment.planId },
      data: { status: "completed" },
    });
  }

  revalidatePath(`/clientes/${installment.customerId}`);
  revalidatePath("/cuotas");

  return NextResponse.json({ ok: true });
}
