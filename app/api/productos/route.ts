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

export const GET = withTenant(async (_req, tenantId) => {
  const products = await prisma.product.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
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
