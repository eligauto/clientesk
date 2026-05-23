import { prisma } from "@/lib/db";
import { getTenantId } from "@/lib/tenant";
import { NuevaVentaForm } from "./form";

export default async function NuevaVentaPage({
  searchParams,
}: {
  searchParams: { clienteId?: string };
}) {
  const tenantId = await getTenantId();

  const [customers, products] = await Promise.all([
    prisma.customer.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        unit: true,
        priceList: true,
        priceCredit: true,
        priceTransfer: true,
        priceCash: true,
      },
    }),
  ]);

  return (
    <NuevaVentaForm
      customers={customers}
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        unit: p.unit,
        priceList: p.priceList ? Number(p.priceList) : null,
        priceCredit: p.priceCredit ? Number(p.priceCredit) : null,
        priceTransfer: p.priceTransfer ? Number(p.priceTransfer) : null,
        priceCash: p.priceCash ? Number(p.priceCash) : null,
      }))}
      defaultClienteId={searchParams.clienteId}
    />
  );
}
