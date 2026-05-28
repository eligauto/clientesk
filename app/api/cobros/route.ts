import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { withTenant, NOT_FOUND } from "@/lib/api";
import { prisma } from "@/lib/db";
import { PaymentMethod } from "@prisma/client";

export const POST = withTenant(async (req, tenantId) => {
  const { customerId, amount, method, date, notes } = await req.json();

  if (!customerId || !amount || !method) {
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

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId },
  });
  if (!customer) return NOT_FOUND;

  const cobro = await prisma.$transaction(async (tx) => {
    const c = await tx.accountPayment.create({
      data: {
        tenantId,
        customerId,
        amount: amt,
        method: method as PaymentMethod,
        date: date ? new Date(date) : new Date(),
        notes: notes?.trim() || null,
      },
    });

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

    await tx.customer.update({
      where: { id: customerId },
      data: {
        balanceDue:
          Number(txSum._sum.totalAmount ?? 0) - Number(paySum._sum.amount ?? 0),
      },
    });

    return c;
  });

  revalidatePath(`/clientes/${customerId}`);
  revalidatePath("/clientes");

  return NextResponse.json(
    { ...cobro, amount: Number(cobro.amount) },
    { status: 201 },
  );
});
