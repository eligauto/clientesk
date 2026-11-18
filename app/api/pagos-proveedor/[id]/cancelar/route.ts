import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAuth, unauthorized, notFound } from "@/lib/api";
import { prisma } from "@/lib/db";
import { recalcSupplierBalance } from "@/lib/balances";

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await getAuth();
  if (!auth) return unauthorized();

  const pago = await prisma.supplierPayment.findFirst({
    where: { id: params.id, tenantId: auth.tenantId },
  });
  if (!pago) return notFound();

  if (pago.status === "cancelled") {
    return NextResponse.json(
      { error: "El registro ya está anulado", code: "INVALID_STATUS" },
      { status: 400 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.supplierPayment.update({
      where: { id: params.id },
      data: { status: "cancelled" },
    });

    await recalcSupplierBalance(tx, pago.supplierId, auth.tenantId);
  });

  revalidatePath(`/proveedores/${pago.supplierId}`);
  revalidatePath("/proveedores");

  return NextResponse.json({ ok: true });
}
