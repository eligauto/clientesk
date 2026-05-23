import { prisma } from "@/lib/db";
import { getTenantId } from "@/lib/tenant";
import { NuevaVentaForm } from "./form";

export default async function NuevaVentaPage({
  searchParams,
}: {
  searchParams: { clienteId?: string };
}) {
  const tenantId = await getTenantId();

  // Solo cargamos clientes (lista pequeña). Productos se buscan async desde el form.
  const customers = await prisma.customer.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <NuevaVentaForm
      customers={customers}
      defaultClienteId={searchParams.clienteId}
    />
  );
}
