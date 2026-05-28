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

  const pago = await prisma.supplierPayment.findFirst({
    where: { id: params.id, tenantId: auth.tenantId },
  });
  if (!pago) return NOT_FOUND;

  if (pago.status === "cancelled") {
    return NextResponse.json(
      { error: "El registro ya está anulado", code: "INVALID_STATUS" },
      { status: 400 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.supplierPayment.update({
      where: { id: params.id },
      data: { status: "cancelled" },
    });

    const [purchaseSum, paySum] = await Promise.all([
      tx.purchase.aggregate({
        where: {
          supplierId: pago.supplierId,
          tenantId: auth.tenantId,
          status: "active",
        },
        _sum: { totalAmount: true },
      }),
      tx.supplierPayment.aggregate({
        where: {
          supplierId: pago.supplierId,
          tenantId: auth.tenantId,
          status: "active",
        },
        _sum: { amount: true },
      }),
    ]);

    await tx.supplier.update({
      where: { id: pago.supplierId },
      data: {
        balanceDue:
          Number(purchaseSum._sum.totalAmount ?? 0) -
          Number(paySum._sum.amount ?? 0),
      },
    });
  });

  revalidatePath(`/proveedores/${pago.supplierId}`);
  revalidatePath("/proveedores");

  return NextResponse.json({ ok: true });
}
