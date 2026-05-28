import { NextResponse } from "next/server";
import { withTenant } from "@/lib/api";
import { prisma } from "@/lib/db";
import { PriceType } from "@prisma/client";

export const POST = withTenant(async (req, tenantId) => {
  const {
    supplierId,
    productId,
    quantity,
    priceType,
    unitPrice,
    commissionPct,
    notes,
    date,
  } = await req.json();

  if (!supplierId || !productId || !quantity || !priceType || !unitPrice) {
    return NextResponse.json(
      { error: "Campos requeridos faltantes", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const qty = Number(quantity);
  const price = Number(unitPrice);
  const commission = Number(commissionPct ?? 0);

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
  const purchaseDate = date ? new Date(date) : new Date();

  const purchase = await prisma.$transaction(async (tx) => {
    const p = await tx.purchase.create({
      data: {
        tenantId,
        supplierId,
        productId,
        quantity: qty,
        priceType: priceType as PriceType,
        unitPrice: price,
        totalAmount,
        commissionPct: commission,
        date: purchaseDate,
        notes: notes?.trim() || null,
      },
    });

    const [purchaseSum, paySum] = await Promise.all([
      tx.purchase.aggregate({
        where: { supplierId, tenantId, status: "active" },
        _sum: { totalAmount: true },
      }),
      tx.supplierPayment.aggregate({
        where: { supplierId, tenantId, status: "active" },
        _sum: { amount: true },
      }),
    ]);

    await tx.supplier.update({
      where: { id: supplierId },
      data: {
        balanceDue:
          Number(purchaseSum._sum.totalAmount ?? 0) -
          Number(paySum._sum.amount ?? 0),
      },
    });

    return p;
  });

  return NextResponse.json(
    {
      ...purchase,
      quantity: Number(purchase.quantity),
      unitPrice: Number(purchase.unitPrice),
      totalAmount: Number(purchase.totalAmount),
      commissionPct: Number(purchase.commissionPct),
    },
    { status: 201 },
  );
});
