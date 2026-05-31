import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { withTenant, NOT_FOUND } from "@/lib/api";
import { prisma } from "@/lib/db";

/**
 * Carga rápida estilo Excel: una sola fila puede generar un cargo ("debe" →
 * venta) y/o un cobro ("a cuenta" → pago), de forma atómica, recalculando el
 * saldo una sola vez. Al menos uno de los dos montos debe ser > 0.
 */
export const POST = withTenant(async (req, tenantId) => {
  const { customerId, referencia, debe, aCuenta, date } = await req.json();

  const ref = typeof referencia === "string" ? referencia.trim() : "";
  const debeAmt = Number(debe) || 0;
  const aCuentaAmt = Number(aCuenta) || 0;

  if (!customerId) {
    return NextResponse.json(
      { error: "Falta el cliente", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  if (debeAmt <= 0 && aCuentaAmt <= 0) {
    return NextResponse.json(
      { error: "Ingresá un monto en Debe o en A cuenta", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  if (debeAmt > 0 && !ref) {
    return NextResponse.json(
      { error: "La venta necesita una referencia", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId },
  });
  if (!customer) return NOT_FOUND;

  const movDate = date ? new Date(date) : new Date();

  await prisma.$transaction(async (tx) => {
    if (debeAmt > 0) {
      await tx.transaction.create({
        data: {
          tenantId,
          customerId,
          productName: ref,
          quantity: 1,
          priceType: "lista",
          unitPrice: debeAmt,
          totalAmount: debeAmt,
          date: movDate,
        },
      });
    }

    if (aCuentaAmt > 0) {
      await tx.accountPayment.create({
        data: {
          tenantId,
          customerId,
          amount: aCuentaAmt,
          method: "efectivo",
          date: movDate,
          notes: ref || null,
        },
      });
    }

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
  });

  revalidatePath(`/clientes/${customerId}`);
  revalidatePath("/clientes");

  return NextResponse.json({ ok: true }, { status: 201 });
});
