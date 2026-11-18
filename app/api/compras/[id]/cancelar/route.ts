import { NextResponse } from "next/server";
import { getAuth, unauthorized, notFound } from "@/lib/api";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { recalcSupplierBalance } from "@/lib/balances";

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await getAuth();
  if (!auth) return unauthorized();

  const purchase = await prisma.purchase.findFirst({
    where: { id: params.id, tenantId: auth.tenantId },
  });
  if (!purchase) return notFound();

  if (purchase.status === "cancelled") {
    return NextResponse.json(
      { error: "El registro ya está anulado", code: "INVALID_STATUS" },
      { status: 400 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.purchase.update({
      where: { id: params.id },
      data: { status: "cancelled" },
    });

    await recalcSupplierBalance(tx, purchase.supplierId, auth.tenantId);
  });

  revalidatePath(`/proveedores/${purchase.supplierId}`);
  revalidatePath("/proveedores");

  return NextResponse.json({ ok: true });
}
