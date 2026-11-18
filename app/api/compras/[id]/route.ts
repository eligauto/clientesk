import { NextResponse } from "next/server";
import { getAuth, unauthorized, notFound } from "@/lib/api";
import { prisma } from "@/lib/db";
import { recalcSupplierBalance } from "@/lib/balances";
import { PriceType } from "@prisma/client";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await getAuth();
  if (!auth) return unauthorized();

  const purchase = await prisma.purchase.findFirst({
    where: { id: params.id, tenantId: auth.tenantId },
    include: {
      supplier: { select: { id: true, name: true } },
      product: { select: { name: true, unit: true } },
    },
  });
  if (!purchase) return notFound();

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
  if (!auth) return unauthorized();

  const purchase = await prisma.purchase.findFirst({
    where: { id: params.id, tenantId: auth.tenantId },
  });
  if (!purchase) return notFound();

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

    await recalcSupplierBalance(tx, purchase.supplierId, auth.tenantId);

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
