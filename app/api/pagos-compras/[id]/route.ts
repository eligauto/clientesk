import { NextResponse } from "next/server";
import { getAuth, UNAUTHORIZED, NOT_FOUND } from "@/lib/api";
import { prisma } from "@/lib/db";

type Ctx = { params: { id: string } };

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await getAuth();
  if (!auth) return UNAUTHORIZED;

  const payment = await prisma.purchasePayment.findFirst({
    where: { id: params.id, tenantId: auth.tenantId },
    include: { purchase: true },
  });

  if (!payment) return NOT_FOUND;

  await prisma.$transaction(async (tx) => {
    await tx.purchasePayment.delete({ where: { id: params.id } });

    await tx.purchase.update({
      where: { id: payment.purchaseId },
      data: {
        amountPaid: { decrement: payment.amount },
        balanceDue: { increment: payment.amount },
      },
    });

    const { _sum } = await tx.purchase.aggregate({
      where: {
        supplierId: payment.purchase.supplierId,
        tenantId: auth.tenantId,
      },
      _sum: { balanceDue: true },
    });

    await tx.supplier.update({
      where: { id: payment.purchase.supplierId },
      data: { balanceDue: _sum.balanceDue ?? 0 },
    });
  });

  return new NextResponse(null, { status: 204 });
}
