import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAuth, UNAUTHORIZED, NOT_FOUND } from "@/lib/api";
import { prisma } from "@/lib/db";
import { PaymentMethod } from "@prisma/client";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await getAuth();
  if (!auth) return UNAUTHORIZED;

  const pago = await prisma.supplierPayment.findFirst({
    where: { id: params.id, tenantId: auth.tenantId },
    include: { supplier: { select: { id: true, name: true } } },
  });
  if (!pago) return NOT_FOUND;

  return NextResponse.json({ ...pago, amount: Number(pago.amount) });
}

export async function PUT(req: Request, { params }: Ctx) {
  const auth = await getAuth();
  if (!auth) return UNAUTHORIZED;

  const pago = await prisma.supplierPayment.findFirst({
    where: { id: params.id, tenantId: auth.tenantId },
  });
  if (!pago) return NOT_FOUND;

  if (pago.status === "cancelled") {
    return NextResponse.json(
      {
        error: "No se puede editar un registro anulado",
        code: "INVALID_STATUS",
      },
      { status: 400 },
    );
  }

  const { amount, method, date, notes } = await req.json();

  const amt = amount !== undefined ? Number(amount) : undefined;
  if (amt !== undefined && amt <= 0) {
    return NextResponse.json(
      { error: "El monto debe ser mayor a 0", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const p = await tx.supplierPayment.update({
      where: { id: params.id },
      data: {
        ...(amt !== undefined ? { amount: amt } : {}),
        ...(method !== undefined ? { method: method as PaymentMethod } : {}),
        ...(date !== undefined ? { date: new Date(date) } : {}),
        ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
      },
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

    return p;
  });

  revalidatePath(`/proveedores/${pago.supplierId}`);

  return NextResponse.json({ ...updated, amount: Number(updated.amount) });
}
