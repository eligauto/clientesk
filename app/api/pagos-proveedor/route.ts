import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { withTenant, NOT_FOUND } from "@/lib/api";
import { prisma } from "@/lib/db";
import { PaymentMethod } from "@prisma/client";

export const POST = withTenant(async (req, tenantId) => {
  const { supplierId, amount, method, date, notes } = await req.json();

  if (!supplierId || !amount || !method) {
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

  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, tenantId },
  });
  if (!supplier) return NOT_FOUND;

  const pago = await prisma.$transaction(async (tx) => {
    const p = await tx.supplierPayment.create({
      data: {
        tenantId,
        supplierId,
        amount: amt,
        method: method as PaymentMethod,
        date: date ? new Date(date) : new Date(),
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

  revalidatePath(`/proveedores/${supplierId}`);
  revalidatePath("/proveedores");

  return NextResponse.json(
    { ...pago, amount: Number(pago.amount) },
    { status: 201 },
  );
});
