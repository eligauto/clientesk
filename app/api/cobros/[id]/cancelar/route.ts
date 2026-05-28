import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAuth, UNAUTHORIZED, NOT_FOUND } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await getAuth();
  if (!auth) return UNAUTHORIZED;

  const cobro = await prisma.accountPayment.findFirst({
    where: { id: params.id, tenantId: auth.tenantId },
  });
  if (!cobro) return NOT_FOUND;

  if (cobro.status === "cancelled") {
    return NextResponse.json(
      { error: "El registro ya está anulado", code: "INVALID_STATUS" },
      { status: 400 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.accountPayment.update({
      where: { id: params.id },
      data: { status: "cancelled" },
    });

    const [txSum, paySum] = await Promise.all([
      tx.transaction.aggregate({
        where: {
          customerId: cobro.customerId,
          tenantId: auth.tenantId,
          status: "active",
        },
        _sum: { totalAmount: true },
      }),
      tx.accountPayment.aggregate({
        where: {
          customerId: cobro.customerId,
          tenantId: auth.tenantId,
          status: "active",
        },
        _sum: { amount: true },
      }),
    ]);

    await tx.customer.update({
      where: { id: cobro.customerId },
      data: {
        balanceDue:
          Number(txSum._sum.totalAmount ?? 0) - Number(paySum._sum.amount ?? 0),
      },
    });
  });

  revalidatePath(`/clientes/${cobro.customerId}`);
  revalidatePath("/clientes");

  return NextResponse.json({ ok: true });
}
