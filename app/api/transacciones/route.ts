import { NextResponse } from "next/server";
import { withTenant } from "@/lib/api";
import { prisma } from "@/lib/db";
import { PriceType, PaymentMethod } from "@prisma/client";

export const POST = withTenant(async (req, tenantId) => {
  const {
    customerId,
    productId,
    productName,
    quantity,
    priceType,
    unitPrice,
    initialPayment,
    paymentMethod,
    notes,
    date,
  } = await req.json();

  const resolvedProductName = productName?.trim() || null;
  if (!customerId || (!productId && !resolvedProductName) || !quantity || !priceType || !unitPrice) {
    return NextResponse.json(
      { error: "Campos requeridos faltantes", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const qty = Number(quantity);
  const price = Number(unitPrice);
  const payment = Number(initialPayment ?? 0);

  if (qty <= 0 || price <= 0) {
    return NextResponse.json(
      { error: "Cantidad y precio deben ser mayores a 0", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const totalAmount = qty * price;

  if (payment < 0 || payment > totalAmount) {
    return NextResponse.json(
      { error: "El pago inicial no puede superar el total", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const balanceDue = totalAmount - payment;
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
        amountPaid: payment,
        balanceDue,
        date: txDate,
        notes: notes?.trim() || null,
      },
    });

    if (payment > 0) {
      await tx.payment.create({
        data: {
          tenantId,
          transactionId: t.id,
          amount: payment,
          method: ((paymentMethod as string) ?? "efectivo") as PaymentMethod,
        },
      });
    }

    const { _sum } = await tx.transaction.aggregate({
      where: { customerId, tenantId },
      _sum: { balanceDue: true },
    });

    await tx.customer.update({
      where: { id: customerId },
      data: { balanceDue: _sum.balanceDue ?? 0 },
    });

    return t;
  });

  return NextResponse.json(
    {
      ...transaction,
      quantity: Number(transaction.quantity),
      unitPrice: Number(transaction.unitPrice),
      totalAmount: Number(transaction.totalAmount),
      amountPaid: Number(transaction.amountPaid),
      balanceDue: Number(transaction.balanceDue),
    },
    { status: 201 }
  );
});
