import { NextResponse } from "next/server";
import { getAuth, UNAUTHORIZED } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await getAuth();
  if (!auth) return UNAUTHORIZED;

  const transactions = await prisma.transaction.findMany({
    where: { customerId: params.id, tenantId: auth.tenantId },
    include: {
      product: { select: { name: true, unit: true } },
      payments: { orderBy: { paidAt: "desc" } },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(
    transactions.map((t) => ({
      ...t,
      quantity: Number(t.quantity),
      unitPrice: Number(t.unitPrice),
      totalAmount: Number(t.totalAmount),
      amountPaid: Number(t.amountPaid),
      balanceDue: Number(t.balanceDue),
      payments: t.payments.map((p) => ({ ...p, amount: Number(p.amount) })),
    }))
  );
}
