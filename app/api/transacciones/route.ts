import { NextResponse } from "next/server";
import { withTenant } from "@/lib/api";
import { prisma } from "@/lib/db";
import { PriceType } from "@prisma/client";

export const POST = withTenant(async (req, tenantId) => {
  const {
    customerId,
    productId,
    productName,
    quantity,
    priceType,
    unitPrice,
    notes,
    date,
  } = await req.json();

  const resolvedProductName = productName?.trim() || null;
  if (
    !customerId ||
    (!productId && !resolvedProductName) ||
    !quantity ||
    !priceType ||
    !unitPrice
  ) {
    return NextResponse.json(
      { error: "Campos requeridos faltantes", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const qty = Number(quantity);
  const price = Number(unitPrice);

  if (qty <= 0 || price <= 0) {
    return NextResponse.json(
      {
        error: "Cantidad y precio deben ser mayores a 0",
        code: "VALIDATION_ERROR",
      },
      { status: 400 },
    );
  }

  const totalAmount = qty * price;
  const txDate = date ? new Date(date) : new Date();

  const transaction = await prisma.$transaction(async (tx) => {
    const t = await tx.transaction.create({
      data: {
        tenantId,
        customerId,
        ...(productId ? { productId } : {}),
        productName: resolvedProductName,
        quantity: qty,
        priceType: priceType as PriceType,
        unitPrice: price,
        totalAmount,
        date: txDate,
        notes: notes?.trim() || null,
      },
    });

    // Recalcular balance: sum(ventas activas) - sum(cobros activos)
    const [txSum, paySum] = await Promise.all([
      tx.transaction.aggregate({
        where: { customerId, tenantId, status: "active" },
        _sum: { totalAmount: true },
      }),
      tx.accountPayment.aggregate({
        where: { customerId, tenantId, status: "active" },
        _sum: { amount: true },
      }),
    ]);

    const newBalance =
      Number(txSum._sum.totalAmount ?? 0) - Number(paySum._sum.amount ?? 0);

    await tx.customer.update({
      where: { id: customerId },
      data: { balanceDue: newBalance },
    });

    return t;
  });

  return NextResponse.json(
    {
      ...transaction,
      quantity: Number(transaction.quantity),
      unitPrice: Number(transaction.unitPrice),
      totalAmount: Number(transaction.totalAmount),
    },
    { status: 201 },
  );
});
