import { prisma } from "@/lib/db";
import { getTenantId } from "@/lib/tenant";
import { ProductosClient } from "./client";

export default async function ProductosPage() {
  const tenantId = await getTenantId();

  const products = await prisma.product.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
  });

  return (
    <ProductosClient
      initialProducts={products.map((p) => ({
        id: p.id,
        name: p.name,
        unit: p.unit,
        priceList: p.priceList ? Number(p.priceList) : null,
        priceCredit: p.priceCredit ? Number(p.priceCredit) : null,
        priceTransfer: p.priceTransfer ? Number(p.priceTransfer) : null,
        priceCash: p.priceCash ? Number(p.priceCash) : null,
        notes: p.notes,
      }))}
    />
  );
}
