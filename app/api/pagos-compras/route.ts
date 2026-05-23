import { NextResponse } from "next/server";
import { withTenant, NOT_FOUND } from "@/lib/api";
import { prisma } from "@/lib/db";
import { PaymentMethod } from "@prisma/client";

export const POST = withTenant(async (req, tenantId) => {
  const { purchaseId, amount, method, notes } = await req.json();

  if (!purchaseId || !amount || !method) {
    return NextResponse.json(
      { error: "Campos requeridos faltantes", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const amt = Number(amount);
  if (amt <= 0) {
    return NextResponse.json(
      { error: "El monto debe ser mayor a 0", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const purchase = await prisma.purchase.findFirst({
    where: { id: purchaseId, tenantId },
  });

  if (!purchase) return NOT_FOUND;

  if (amt > Number(purchase.balanceDue)) {
    return NextResponse.json(
      { error: "El monto supera el saldo pendiente", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const payment = await prisma.$transaction(async (tx) => {
    const pago = await tx.purchasePayment.create({
      data: {
        tenantId,
        purchaseId,
        amount: amt,
        method: method as PaymentMethod,
        notes: notes?.trim() || null,
      },
    });

    await tx.purchase.update({
      where: { id: purchaseId },
      data: {
        amountPaid: { increment: amt },
        balanceDue: { decrement: amt },
      },
    });

    const { _sum } = await tx.purchase.aggregate({
      where: { supplierId: purchase.supplierId, tenantId },
      _sum: { balanceDue: true },
    });

    await tx.supplier.update({
      where: { id: purchase.supplierId },
      data: { balanceDue: _sum.balanceDue ?? 0 },
    });

    return pago;
  });

  return NextResponse.json(
    { ...payment, amount: Number(payment.amount) },
    { status: 201 },
  );
});
