import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAuth, unauthorized, notFound } from "@/lib/api";
import { prisma } from "@/lib/db";
import { recalcCustomerBalance } from "@/lib/balances";

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await getAuth();
  if (!auth) return unauthorized();

  const cobro = await prisma.accountPayment.findFirst({
    where: { id: params.id, tenantId: auth.tenantId },
  });
  if (!cobro) return notFound();

  if (cobro.status === "cancelled") {
    return NextResponse.json(
      { error: "El registro ya está anulado", code: "INVALID_STATUS" },
      { status: 400 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.accountPayment.update({
      where: { id: params.id },
      data: { status: "cancelled" },
    });

    await recalcCustomerBalance(tx, cobro.customerId, auth.tenantId);
  });

  revalidatePath(`/clientes/${cobro.customerId}`);
  revalidatePath("/clientes");

  return NextResponse.json({ ok: true });
}
