import { NextResponse } from "next/server";
import { getAuth, unauthorized, notFound } from "@/lib/api";
import { prisma } from "@/lib/db";
import { recalcCustomerBalance } from "@/lib/balances";
import { PriceType } from "@prisma/client";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await getAuth();
  if (!auth) return unauthorized();

  const transaction = await prisma.transaction.findFirst({
    where: { id: params.id, tenantId: auth.tenantId },
    include: {
      customer: { select: { id: true, name: true } },
      product: { select: { id: true, name: true, unit: true } },
    },
  });

  if (!transaction) return notFound();

  return NextResponse.json({
    ...transaction,
    quantity: Number(transaction.quantity),
    unitPrice: Number(transaction.unitPrice),
    totalAmount: Number(transaction.totalAmount),
  });
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await getAuth();
  if (!auth) return unauthorized();

  const transaction = await prisma.transaction.findFirst({
    where: { id: params.id, tenantId: auth.tenantId },
  });
  if (!transaction) return notFound();

  if (transaction.status === "cancelled") {
    return NextResponse.json(
      {
        error: "No se puede editar un registro anulado",
        code: "INVALID_STATUS",
      },
      { status: 400 },
    );
  }

  const { productName, quantity, priceType, unitPrice, date, notes } =
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

  const newQty = qty ?? Number(transaction.quantity);
  const newPrice = price ?? Number(transaction.unitPrice);
  const newTotal = newQty * newPrice;

  const updated = await prisma.$transaction(async (tx) => {
    const t = await tx.transaction.update({
      where: { id: params.id },
      data: {
        ...(productName !== undefined
          ? { productName: productName.trim() || null }
          : {}),
        ...(qty !== undefined ? { quantity: qty } : {}),
        ...(priceType !== undefined
          ? { priceType: priceType as PriceType }
          : {}),
        ...(price !== undefined ? { unitPrice: price } : {}),
        totalAmount: newTotal,
        ...(date !== undefined ? { date: new Date(date) } : {}),
        ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
      },
    });

    await recalcCustomerBalance(tx, transaction.customerId, auth.tenantId);

    return t;
  });

  return NextResponse.json({
    ...updated,
    quantity: Number(updated.quantity),
    unitPrice: Number(updated.unitPrice),
    totalAmount: Number(updated.totalAmount),
  });
}
