import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getTenantId } from "@/lib/tenant";
import { EditarVentaForm } from "./form";

export default async function EditarTransaccionPage({
  params,
}: {
  params: { id: string };
}) {
  const tenantId = await getTenantId();

  const t = await prisma.transaction.findFirst({
    where: { id: params.id, tenantId },
  });

  if (!t) notFound();
  if (t.status === "cancelled") redirect(`/clientes/${t.customerId}`);

  return (
    <EditarVentaForm
      transaction={{
        id: t.id,
        customerId: t.customerId,
        productName: (t as any).productName ?? "",
        quantity: Number(t.quantity),
        priceType: t.priceType,
        unitPrice: Number(t.unitPrice),
        date:
          t.date instanceof Date
            ? t.date.toISOString().split("T")[0]
            : String(t.date).split("T")[0],
        notes: t.notes ?? "",
      }}
    />
  );
}
