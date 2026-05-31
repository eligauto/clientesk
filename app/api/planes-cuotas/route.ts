import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { withTenant, NOT_FOUND } from "@/lib/api";
import { prisma } from "@/lib/db";
import { InstallmentFrequency } from "@prisma/client";

function nextDueDate(
  base: Date,
  frequency: InstallmentFrequency,
  n: number,
): Date {
  const d = new Date(base);
  if (frequency === "semanal") d.setDate(d.getDate() + 7 * n);
  else if (frequency === "quincenal") d.setDate(d.getDate() + 14 * n);
  else d.setMonth(d.getMonth() + n);
  return d;
}

export const POST = withTenant(async (req, tenantId) => {
  const body = await req.json();
  const {
    customerId,
    transactionId,
    description,
    totalAmount,
    installmentCount,
    frequency,
    firstDueDate,
  } = body;

  if (
    !customerId ||
    !description ||
    !totalAmount ||
    !installmentCount ||
    !frequency ||
    !firstDueDate
  ) {
    return NextResponse.json(
      { error: "Campos requeridos faltantes", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const total = Number(totalAmount);
  const count = Number(installmentCount);

  if (total <= 0 || count < 1 || count > 120) {
    return NextResponse.json(
      {
        error: "Monto o cantidad de cuotas inválidos",
        code: "VALIDATION_ERROR",
      },
      { status: 400 },
    );
  }

  if (!["semanal", "quincenal", "mensual"].includes(frequency)) {
    return NextResponse.json(
      { error: "Frecuencia inválida", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId },
  });
  if (!customer) return NOT_FOUND;

  if (transactionId) {
    const tx = await prisma.transaction.findFirst({
      where: { id: transactionId, tenantId },
    });
    if (!tx) return NOT_FOUND;
  }

  const baseDate = new Date(firstDueDate);
  const baseAmount = Math.floor((total / count) * 100) / 100;
  const lastAmount = Math.round((total - baseAmount * (count - 1)) * 100) / 100;

  const plan = await prisma.paymentPlan.create({
    data: {
      tenantId,
      customerId,
      transactionId: transactionId || null,
      description: description.trim(),
      totalAmount: total,
      installmentCount: count,
      frequency: frequency as InstallmentFrequency,
      firstDueDate: baseDate,
      installments: {
        create: Array.from({ length: count }, (_, i) => ({
          tenantId,
          customerId,
          installmentNumber: i + 1,
          dueDate: nextDueDate(baseDate, frequency as InstallmentFrequency, i),
          expectedAmount: i === count - 1 ? lastAmount : baseAmount,
        })),
      },
    },
    include: { installments: { orderBy: { installmentNumber: "asc" } } },
  });

  revalidatePath(`/clientes/${customerId}`);
  revalidatePath("/cuotas");

  return NextResponse.json(plan, { status: 201 });
});
