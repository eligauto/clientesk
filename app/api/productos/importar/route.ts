import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAuth, UNAUTHORIZED } from "@/lib/api";
import { prisma } from "@/lib/db";
import { calcPrices } from "@/lib/price-multipliers";

type Row = {
  sku: string | null;
  name: string;
  notes: string | null;
  costPrice: number | null;
};

export async function POST(req: NextRequest) {
  const auth = await getAuth();
  if (!auth) return UNAUTHORIZED;

  const { rows } = (await req.json()) as { rows: Row[] };

  // Deduplicar por sku: si el Excel tiene el mismo código dos veces, ganó el último
  const skuMap = new Map<string, Row>();
  for (const r of rows) {
    if (r.sku) skuMap.set(r.sku, r);
  }
  const withSku    = Array.from(skuMap.values());
  const withoutSku = rows.filter((r) => !r.sku);
  let processed = 0;

  // Un solo INSERT … ON CONFLICT por chunk — un único round-trip a la DB
  if (withSku.length > 0) {
    const inserts = withSku.map((r) => {
      const p = calcPrices(r.costPrice);
      return Prisma.sql`(${crypto.randomUUID()}, ${auth.tenantId}, ${r.sku}, ${r.name}, ${r.notes}, ${r.costPrice}, ${p.priceList}, ${p.priceCredit}, ${p.priceTransfer}, ${p.priceCash})`;
    });

    await prisma.$executeRaw`
      INSERT INTO products (id, tenant_id, sku, name, notes, cost_price, price_list, price_credit, price_transfer, price_cash)
      VALUES ${Prisma.join(inserts, ",")}
      ON CONFLICT (tenant_id, sku) DO UPDATE SET
        name           = EXCLUDED.name,
        notes          = EXCLUDED.notes,
        cost_price     = EXCLUDED.cost_price,
        price_list     = EXCLUDED.price_list,
        price_credit   = EXCLUDED.price_credit,
        price_transfer = EXCLUDED.price_transfer,
        price_cash     = EXCLUDED.price_cash
    `;
    processed += withSku.length;
  }

  if (withoutSku.length > 0) {
    const result = await prisma.product.createMany({
      data: withoutSku.map((r) => {
        const p = calcPrices(r.costPrice);
        return { tenantId: auth.tenantId, name: r.name, notes: r.notes, costPrice: r.costPrice, ...p };
      }),
      skipDuplicates: true,
    });
    processed += result.count;
  }

  return NextResponse.json({ processed });
}
