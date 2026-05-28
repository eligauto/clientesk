import { NextResponse } from "next/server";
import { getAuth, UNAUTHORIZED, NOT_FOUND } from "@/lib/api";
import { prisma } from "@/lib/db";
import { PriceType } from "@prisma/client";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await getAuth();
  if (!auth) return UNAUTHORIZED;

  const transaction = await prisma.transaction.findFirst({
    where: { id: params.id, tenantId: auth.tenantId },
    include: {
      customer: { select: { id: true, name: true } },
      product: { select: { id: true, name: true, unit: true } },
    },
  });

  if (!transaction) return NOT_FOUND;

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
  if (!auth) return UNAUTHORIZED;

  const transaction = await prisma.transaction.findFirst({
    where: { id: params.id, tenantId: auth.tenantId },
  });
  if (!transaction) return NOT_FOUND;

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

    const [txSum, paySum] = await Promise.all([
      tx.transaction.aggregate({
        where: {
          customerId: transaction.customerId,
          tenantId: auth.tenantId,
          status: "active",
        },
        _sum: { totalAmount: true },
      }),
      tx.accountPayment.aggregate({
        where: {
          customerId: transaction.customerId,
          tenantId: auth.tenantId,
          status: "active",
        },
        _sum: { amount: true },
      }),
    ]);

    await tx.customer.update({
      where: { id: transaction.customerId },
      data: {
        balanceDue:
          Number(txSum._sum.totalAmount ?? 0) - Number(paySum._sum.amount ?? 0),
      },
    });

    return t;
  });

  return NextResponse.json({
    ...updated,
    quantity: Number(updated.quantity),
    unitPrice: Number(updated.unitPrice),
    totalAmount: Number(updated.totalAmount),
  });
}
