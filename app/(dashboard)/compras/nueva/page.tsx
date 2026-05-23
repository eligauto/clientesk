import { prisma } from "@/lib/db";
import { getTenantId } from "@/lib/tenant";
import { NuevaCompraForm } from "./form";

export default async function NuevaCompraPage({
  searchParams,
}: {
  searchParams: { proveedorId?: string };
}) {
  const tenantId = await getTenantId();

  const suppliers = await prisma.supplier.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <NuevaCompraForm
      suppliers={suppliers}
      defaultProveedorId={searchParams.proveedorId}
    />
  );
}
