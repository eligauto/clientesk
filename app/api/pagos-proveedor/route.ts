import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { withTenant, notFound } from "@/lib/api";
import { prisma } from "@/lib/db";
import { recalcSupplierBalance } from "@/lib/balances";
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
  if (!supplier) return notFound();

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

    await recalcSupplierBalance(tx, supplierId, tenantId);

    return p;
  });

  revalidatePath(`/proveedores/${supplierId}`);
  revalidatePath("/proveedores");

  return NextResponse.json(
    { ...pago, amount: Number(pago.amount) },
    { status: 201 },
  );
});
