import { prisma } from "@/lib/db";
import { getTenantId } from "@/lib/tenant";
import { ProductosClient } from "./client";

const PAGE_SIZE = 50;

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string };
}) {
  const tenantId = await getTenantId();
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const q = searchParams.q?.trim() ?? "";

  const where = {
    tenantId,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { sku: { contains: q, mode: "insensitive" as const } },
            { notes: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
  ]);

  return (
    <ProductosClient
      initialProducts={products.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        unit: p.unit,
        priceList: p.priceList ? Number(p.priceList) : null,
        priceCredit: p.priceCredit ? Number(p.priceCredit) : null,
        priceTransfer: p.priceTransfer ? Number(p.priceTransfer) : null,
        priceCash: p.priceCash ? Number(p.priceCash) : null,
        notes: p.notes,
      }))}
      page={page}
      totalPages={Math.ceil(total / PAGE_SIZE)}
      total={total}
      query={q}
    />
  );
}
