import { NextResponse } from "next/server";
import { getAuth, UNAUTHORIZED, NOT_FOUND } from "@/lib/api";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await getAuth();
  if (!auth) return UNAUTHORIZED;

  const purchase = await prisma.purchase.findFirst({
    where: { id: params.id, tenantId: auth.tenantId },
  });
  if (!purchase) return NOT_FOUND;

  if (purchase.status === "cancelled") {
    return NextResponse.json(
      { error: "El registro ya está anulado", code: "INVALID_STATUS" },
      { status: 400 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.purchase.update({
      where: { id: params.id },
      data: { status: "cancelled" },
    });

    const [purchaseSum, paySum] = await Promise.all([
      tx.purchase.aggregate({
        where: {
          supplierId: purchase.supplierId,
          tenantId: auth.tenantId,
          status: "active",
        },
        _sum: { totalAmount: true },
      }),
      tx.supplierPayment.aggregate({
        where: {
          supplierId: purchase.supplierId,
          tenantId: auth.tenantId,
          status: "active",
        },
        _sum: { amount: true },
      }),
    ]);

    await tx.supplier.update({
      where: { id: purchase.supplierId },
      data: {
        balanceDue:
          Number(purchaseSum._sum.totalAmount ?? 0) -
          Number(paySum._sum.amount ?? 0),
      },
    });
  });

  revalidatePath(`/proveedores/${purchase.supplierId}`);
  revalidatePath("/proveedores");

  return NextResponse.json({ ok: true });
}
