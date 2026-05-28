import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAuth, UNAUTHORIZED, NOT_FOUND } from "@/lib/api";
import { prisma } from "@/lib/db";
import { PaymentMethod } from "@prisma/client";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await getAuth();
  if (!auth) return UNAUTHORIZED;

  const cobro = await prisma.accountPayment.findFirst({
    where: { id: params.id, tenantId: auth.tenantId },
    include: { customer: { select: { id: true, name: true } } },
  });
  if (!cobro) return NOT_FOUND;

  return NextResponse.json({ ...cobro, amount: Number(cobro.amount) });
}

export async function PUT(req: Request, { params }: Ctx) {
  const auth = await getAuth();
  if (!auth) return UNAUTHORIZED;

  const cobro = await prisma.accountPayment.findFirst({
    where: { id: params.id, tenantId: auth.tenantId },
  });
  if (!cobro) return NOT_FOUND;

  if (cobro.status === "cancelled") {
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
    const c = await tx.accountPayment.update({
      where: { id: params.id },
      data: {
        ...(amt !== undefined ? { amount: amt } : {}),
        ...(method !== undefined ? { method: method as PaymentMethod } : {}),
        ...(date !== undefined ? { date: new Date(date) } : {}),
        ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
      },
    });

    const [txSum, paySum] = await Promise.all([
      tx.transaction.aggregate({
        where: {
          customerId: cobro.customerId,
          tenantId: auth.tenantId,
          status: "active",
        },
        _sum: { totalAmount: true },
      }),
      tx.accountPayment.aggregate({
        where: {
          customerId: cobro.customerId,
          tenantId: auth.tenantId,
          status: "active",
        },
        _sum: { amount: true },
      }),
    ]);

    await tx.customer.update({
      where: { id: cobro.customerId },
      data: {
        balanceDue:
          Number(txSum._sum.totalAmount ?? 0) - Number(paySum._sum.amount ?? 0),
      },
    });

    return c;
  });

  revalidatePath(`/clientes/${cobro.customerId}`);

  return NextResponse.json({ ...updated, amount: Number(updated.amount) });
}
