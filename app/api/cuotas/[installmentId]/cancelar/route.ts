import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAuth, notFound, unauthorized } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: { installmentId: string } },
) {
  const auth = await getAuth();
  if (!auth) return unauthorized();

  const installment = await prisma.paymentPlanInstallment.findFirst({
    where: { id: params.installmentId, tenantId: auth.tenantId },
  });
  if (!installment) return notFound();

  await prisma.paymentPlanInstallment.update({
    where: { id: params.installmentId },
    data: { status: "cancelled" },
  });

  revalidatePath(`/clientes/${installment.customerId}`);
  revalidatePath("/cuotas");

  return NextResponse.json({ ok: true });
}
