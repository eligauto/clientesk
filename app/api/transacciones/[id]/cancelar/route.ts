import { NextResponse } from "next/server";
import { getAuth, unauthorized, notFound } from "@/lib/api";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { recalcCustomerBalance } from "@/lib/balances";

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await getAuth();
  if (!auth) return unauthorized();

  const transaction = await prisma.transaction.findFirst({
    where: { id: params.id, tenantId: auth.tenantId },
  });
  if (!transaction) return notFound();

  if (transaction.status === "cancelled") {
    return NextResponse.json(
      { error: "El registro ya está anulado", code: "INVALID_STATUS" },
      { status: 400 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.transaction.update({
      where: { id: params.id },
      data: { status: "cancelled" },
    });

    await recalcCustomerBalance(tx, transaction.customerId, auth.tenantId);
  });

  revalidatePath(`/clientes/${transaction.customerId}`);
  revalidatePath("/clientes");

  return NextResponse.json({ ok: true });
}
