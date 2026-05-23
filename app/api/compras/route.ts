import { NextResponse } from "next/server";
import { withTenant } from "@/lib/api";
import { prisma } from "@/lib/db";
import { PriceType, PaymentMethod } from "@prisma/client";

export const POST = withTenant(async (req, tenantId) => {
  const {
    supplierId,
    productId,
    quantity,
    priceType,
    unitPrice,
    commissionPct,
    initialPayment,
    paymentMethod,
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
  const payment = Number(initialPayment ?? 0);

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

  if (payment < 0 || payment > totalAmount) {
    return NextResponse.json(
      {
        error: "El pago inicial no puede superar el total",
        code: "VALIDATION_ERROR",
      },
      { status: 400 },
    );
  }

  const balanceDue = totalAmount - payment;
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
        amountPaid: payment,
        balanceDue,
        commissionPct: commission,
        date: purchaseDate,
        notes: notes?.trim() || null,
      },
    });

    if (payment > 0) {
      await tx.purchasePayment.create({
        data: {
          tenantId,
          purchaseId: p.id,
          amount: payment,
          method: ((paymentMethod as string) ?? "efectivo") as PaymentMethod,
        },
      });
    }

    const { _sum } = await tx.purchase.aggregate({
      where: { supplierId, tenantId },
      _sum: { balanceDue: true },
    });

    await tx.supplier.update({
      where: { id: supplierId },
      data: { balanceDue: _sum.balanceDue ?? 0 },
    });

    return p;
  });

  return NextResponse.json(
    {
      ...purchase,
      quantity: Number(purchase.quantity),
      unitPrice: Number(purchase.unitPrice),
      totalAmount: Number(purchase.totalAmount),
      amountPaid: Number(purchase.amountPaid),
      balanceDue: Number(purchase.balanceDue),
      commissionPct: Number(purchase.commissionPct),
    },
    { status: 201 },
  );
});
