import { NextResponse } from "next/server";
import { withTenant } from "@/lib/api";
import { prisma } from "@/lib/db";
import { recalcCustomerBalance } from "@/lib/balances";
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

    await recalcCustomerBalance(tx, customerId, tenantId);

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
