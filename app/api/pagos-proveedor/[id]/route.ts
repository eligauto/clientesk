import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAuth, unauthorized, notFound } from "@/lib/api";
import { prisma } from "@/lib/db";
import { recalcSupplierBalance } from "@/lib/balances";
import { PaymentMethod } from "@prisma/client";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await getAuth();
  if (!auth) return unauthorized();

  const pago = await prisma.supplierPayment.findFirst({
    where: { id: params.id, tenantId: auth.tenantId },
    include: { supplier: { select: { id: true, name: true } } },
  });
  if (!pago) return notFound();

  return NextResponse.json({ ...pago, amount: Number(pago.amount) });
}

export async function PUT(req: Request, { params }: Ctx) {
  const auth = await getAuth();
  if (!auth) return unauthorized();

  const pago = await prisma.supplierPayment.findFirst({
    where: { id: params.id, tenantId: auth.tenantId },
  });
  if (!pago) return notFound();

  if (pago.status === "cancelled") {
    return NextResponse.json(
      {
        error: "No se puede editar un registro anulado",
        code: "INVALID_STATUS",
      },
      { status: 400 },
    );
  }

  const { amount, method, date, notes } = await req.json();

  const amt = amount !== undefined ? Number(amount) : undefined;
  if (amt !== undefined && amt <= 0) {
    return NextResponse.json(
      { error: "El monto debe ser mayor a 0", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const p = await tx.supplierPayment.update({
      where: { id: params.id },
      data: {
        ...(amt !== undefined ? { amount: amt } : {}),
        ...(method !== undefined ? { method: method as PaymentMethod } : {}),
        ...(date !== undefined ? { date: new Date(date) } : {}),
        ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
      },
    });

    await recalcSupplierBalance(tx, pago.supplierId, auth.tenantId);

    return p;
  });

  revalidatePath(`/proveedores/${pago.supplierId}`);

  return NextResponse.json({ ...updated, amount: Number(updated.amount) });
}
