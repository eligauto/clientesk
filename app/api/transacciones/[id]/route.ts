import { NextResponse } from "next/server";
import { getAuth, UNAUTHORIZED, NOT_FOUND } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await getAuth();
  if (!auth) return UNAUTHORIZED;

  const transaction = await prisma.transaction.findFirst({
    where: { id: params.id, tenantId: auth.tenantId },
    include: {
      customer: { select: { id: true, name: true } },
      product: { select: { id: true, name: true, unit: true } },
      payments: { orderBy: { paidAt: "desc" } },
    },
  });

  if (!transaction) return NOT_FOUND;

  return NextResponse.json({
    ...transaction,
    quantity: Number(transaction.quantity),
    unitPrice: Number(transaction.unitPrice),
    totalAmount: Number(transaction.totalAmount),
    amountPaid: Number(transaction.amountPaid),
    balanceDue: Number(transaction.balanceDue),
    payments: transaction.payments.map((p) => ({
      ...p,
      amount: Number(p.amount),
    })),
  });
}
