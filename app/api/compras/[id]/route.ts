import { NextResponse } from "next/server";
import { getAuth, UNAUTHORIZED, NOT_FOUND } from "@/lib/api";
import { prisma } from "@/lib/db";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await getAuth();
  if (!auth) return UNAUTHORIZED;

  const purchase = await prisma.purchase.findFirst({
    where: { id: params.id, tenantId: auth.tenantId },
    include: {
      supplier: { select: { id: true, name: true } },
      product: { select: { name: true, unit: true } },
      purchasePayments: { orderBy: { paidAt: "asc" } },
    },
  });
  if (!purchase) return NOT_FOUND;

  return NextResponse.json({
    ...purchase,
    quantity: Number(purchase.quantity),
    unitPrice: Number(purchase.unitPrice),
    totalAmount: Number(purchase.totalAmount),
    amountPaid: Number(purchase.amountPaid),
    balanceDue: Number(purchase.balanceDue),
    commissionPct: Number(purchase.commissionPct),
    purchasePayments: purchase.purchasePayments.map((p) => ({
      ...p,
      amount: Number(p.amount),
    })),
  });
}
