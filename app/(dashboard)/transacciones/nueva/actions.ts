"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getTenantId } from "@/lib/tenant";
import { PriceType } from "@prisma/client";

type Input = {
  customerId: string;
  productName: string;
  quantity: number;
  priceType: string;
  unitPrice: number;
  notes?: string;
  date: string;
};

export async function crearTransaccion(
  data: Input,
): Promise<{ error: string } | void> {
  const tenantId = await getTenantId();

  const {
    customerId,
    productName,
    quantity,
    priceType,
    unitPrice,
    notes,
    date,
  } = data;

  if (!customerId || !productName || quantity <= 0 || unitPrice <= 0) {
    return { error: "Campos requeridos faltantes o valores inválidos" };
  }

  const totalAmount = quantity * unitPrice;
  const txDate = date ? new Date(date) : new Date();

  await prisma.$transaction(async (tx) => {
    await tx.transaction.create({
      data: {
        tenantId,
        customerId,
        productName,
        quantity,
        priceType: priceType as PriceType,
        unitPrice,
        totalAmount,
        date: txDate,
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

    const newBalance =
      Number(txSum._sum.totalAmount ?? 0) - Number(paySum._sum.amount ?? 0);

    await tx.customer.update({
      where: { id: customerId },
      data: { balanceDue: newBalance },
    });
  });

  revalidatePath(`/clientes/${customerId}`);
  revalidatePath("/clientes");
  redirect(`/clientes/${customerId}`);
}
