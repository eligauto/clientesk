import { NextResponse } from "next/server";
import { withTenant } from "@/lib/api";
import { prisma } from "@/lib/db";
import { calcPrices } from "@/lib/price-multipliers";
import type { Product } from "@prisma/client";

function serialise(p: Product) {
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    unit: p.unit,
    costPrice: p.costPrice ? Number(p.costPrice) : null,
    priceList: p.priceList ? Number(p.priceList) : null,
    priceCredit: p.priceCredit ? Number(p.priceCredit) : null,
    priceTransfer: p.priceTransfer ? Number(p.priceTransfer) : null,
    priceCash: p.priceCash ? Number(p.priceCash) : null,
    notes: p.notes,
  };
}

const PAGE_SIZE = 50;

export const GET = withTenant(async (req, tenantId) => {
  const url = new URL(req.url);
  const q    = url.searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);

  const where = {
    tenantId,
    ...(q ? {
      OR: [
        { name: { contains: q, mode: "insensitive" as const } },
        { sku:  { contains: q, mode: "insensitive" as const } },
        { notes: { contains: q, mode: "insensitive" as const } },
      ],
    } : {}),
  };

  const products = await prisma.product.findMany({
    where,
    orderBy: { name: "asc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return NextResponse.json(products.map(serialise));
});

export const POST = withTenant(async (req, tenantId) => {
  const { sku, name, unit, costPrice, priceList, priceCredit, priceTransfer, priceCash, notes } =
    await req.json();

  if (!name?.trim()) {
    return NextResponse.json(
      { error: "El nombre es requerido", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const calc = calcPrices(costPrice || null);
  const product = await prisma.product.create({
    data: {
      tenantId,
      sku: sku?.trim() || null,
      name: name.trim(),
      unit: unit?.trim() || null,
      costPrice: costPrice || null,
      priceList:     priceList     ?? calc.priceList,
      priceCredit:   priceCredit   ?? calc.priceCredit,
      priceTransfer: priceTransfer ?? calc.priceTransfer,
      priceCash:     priceCash     ?? calc.priceCash,
      notes: notes?.trim() || null,
    },
  });

  return NextResponse.json(serialise(product), { status: 201 });
});
