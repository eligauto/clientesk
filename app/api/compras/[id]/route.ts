import { NextResponse } from "next/server";
import { getAuth, UNAUTHORIZED, NOT_FOUND } from "@/lib/api";
import { prisma } from "@/lib/db";
import { PriceType } from "@prisma/client";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await getAuth();
  if (!auth) return UNAUTHORIZED;

  const purchase = await prisma.purchase.findFirst({
    where: { id: params.id, tenantId: auth.tenantId },
    include: {
      supplier: { select: { id: true, name: true } },
      product: { select: { name: true, unit: true } },
    },
  });
  if (!purchase) return NOT_FOUND;

  return NextResponse.json({
    ...purchase,
    quantity: Number(purchase.quantity),
    unitPrice: Number(purchase.unitPrice),
    totalAmount: Number(purchase.totalAmount),
    commissionPct: Number(purchase.commissionPct),
  });
}

export async function PUT(req: Request, { params }: Ctx) {
  const auth = await getAuth();
  if (!auth) return UNAUTHORIZED;

  const purchase = await prisma.purchase.findFirst({
    where: { id: params.id, tenantId: auth.tenantId },
  });
  if (!purchase) return NOT_FOUND;

  if (purchase.status === "cancelled") {
    return NextResponse.json(
      {
        error: "No se puede editar un registro anulado",
        code: "INVALID_STATUS",
      },
      { status: 400 },
    );
  }

  const { quantity, priceType, unitPrice, commissionPct, date, notes } =
    await req.json();

  const qty = quantity !== undefined ? Number(quantity) : undefined;
  const price = unitPrice !== undefined ? Number(unitPrice) : undefined;

  if ((qty !== undefined && qty <= 0) || (price !== undefined && price <= 0)) {
    return NextResponse.json(
      {
        error: "Cantidad y precio deben ser mayores a 0",
        code: "VALIDATION_ERROR",
      },
      { status: 400 },
    );
  }

  const newQty = qty ?? Number(purchase.quantity);
  const newPrice = price ?? Number(purchase.unitPrice);
  const newTotal = newQty * newPrice;

  const updated = await prisma.$transaction(async (tx) => {
    const p = await tx.purchase.update({
      where: { id: params.id },
      data: {
        ...(qty !== undefined ? { quantity: qty } : {}),
        ...(priceType !== undefined
          ? { priceType: priceType as PriceType }
          : {}),
        ...(price !== undefined ? { unitPrice: price } : {}),
        totalAmount: newTotal,
        ...(commissionPct !== undefined
          ? { commissionPct: Number(commissionPct) }
          : {}),
        ...(date !== undefined ? { date: new Date(date) } : {}),
        ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
      },
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

    return p;
  });

  return NextResponse.json({
    ...updated,
    quantity: Number(updated.quantity),
    unitPrice: Number(updated.unitPrice),
    totalAmount: Number(updated.totalAmount),
    commissionPct: Number(updated.commissionPct),
  });
}
