import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { withTenant, NOT_FOUND } from "@/lib/api";
import { prisma } from "@/lib/db";
import { PaymentMethod } from "@prisma/client";

export const POST = withTenant(async (req, tenantId) => {
  const { transactionId, amount, method, notes } = await req.json();

  if (!transactionId || !amount || !method) {
    return NextResponse.json(
      { error: "Campos requeridos faltantes", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const amt = Number(amount);
  if (amt <= 0) {
    return NextResponse.json(
      { error: "El monto debe ser mayor a 0", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, tenantId },
  });

  if (!transaction) return NOT_FOUND;

  if (amt > Number(transaction.balanceDue)) {
    return NextResponse.json(
      { error: "El monto supera el saldo pendiente", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const payment = await prisma.$transaction(async (tx) => {
    const pago = await tx.payment.create({
      data: {
        tenantId,
        transactionId,
        amount: amt,
        method: method as PaymentMethod,
        notes: notes?.trim() || null,
      },
    });

    await tx.transaction.update({
      where: { id: transactionId },
      data: {
        amountPaid: { increment: amt },
        balanceDue: { decrement: amt },
      },
    });

    const { _sum } = await tx.transaction.aggregate({
      where: { customerId: transaction.customerId, tenantId },
      _sum: { balanceDue: true },
    });

    await tx.customer.update({
      where: { id: transaction.customerId },
      data: { balanceDue: _sum.balanceDue ?? 0 },
    });

    return pago;
  });

  revalidatePath(`/transacciones/${transactionId}`);
  revalidatePath(`/clientes/${transaction.customerId}`);
  revalidatePath("/clientes");

  return NextResponse.json(
    { ...payment, amount: Number(payment.amount) },
    { status: 201 }
  );
});
