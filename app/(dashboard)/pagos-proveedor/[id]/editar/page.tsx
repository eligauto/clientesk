import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getTenantId } from "@/lib/tenant";
import { EditarPagoProveedorForm } from "./form";

export default async function EditarPagoProveedorPage({
  params,
}: {
  params: { id: string };
}) {
  const tenantId = await getTenantId();

  const pago = await prisma.supplierPayment.findFirst({
    where: { id: params.id, tenantId },
  });

  if (!pago) notFound();
  if (pago.status === "cancelled") redirect(`/proveedores/${pago.supplierId}`);

  return (
    <EditarPagoProveedorForm
      pago={{
        id: pago.id,
        supplierId: pago.supplierId,
        amount: Number(pago.amount),
        method: pago.method,
        date:
          pago.date instanceof Date
            ? pago.date.toISOString().split("T")[0]
            : String(pago.date).split("T")[0],
        notes: pago.notes ?? "",
      }}
    />
  );
}
