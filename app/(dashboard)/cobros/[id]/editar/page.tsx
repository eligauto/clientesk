import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getTenantId } from "@/lib/tenant";
import { EditarCobroForm } from "./form";

export default async function EditarCobroPage({
  params,
}: {
  params: { id: string };
}) {
  const tenantId = await getTenantId();

  const cobro = await prisma.accountPayment.findFirst({
    where: { id: params.id, tenantId },
  });

  if (!cobro) notFound();
  if (cobro.status === "cancelled") redirect(`/clientes/${cobro.customerId}`);

  return (
    <EditarCobroForm
      cobro={{
        id: cobro.id,
        customerId: cobro.customerId,
        amount: Number(cobro.amount),
        method: cobro.method,
        date:
          cobro.date instanceof Date
            ? cobro.date.toISOString().split("T")[0]
            : String(cobro.date).split("T")[0],
        notes: cobro.notes ?? "",
      }}
    />
  );
}
