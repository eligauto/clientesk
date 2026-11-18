import { NextResponse } from "next/server";
import { getAuth, unauthorized } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await getAuth();
  if (!auth) return unauthorized();

  const transactions = await prisma.transaction.findMany({
    where: { customerId: params.id, tenantId: auth.tenantId },
    include: {
      product: { select: { name: true, unit: true } },
    },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(
    transactions.map((t) => ({
      ...t,
      quantity: Number(t.quantity),
      unitPrice: Number(t.unitPrice),
      totalAmount: Number(t.totalAmount),
    })),
  );
}
