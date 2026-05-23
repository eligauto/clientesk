import { NextResponse } from "next/server";
import { withTenant } from "@/lib/api";
import { prisma } from "@/lib/db";
import type { Product } from "@prisma/client";

function serialise(p: Product) {
  return {
    ...p,
    priceList: p.priceList ? Number(p.priceList) : null,
    priceCredit: p.priceCredit ? Number(p.priceCredit) : null,
    priceTransfer: p.priceTransfer ? Number(p.priceTransfer) : null,
    priceCash: p.priceCash ? Number(p.priceCash) : null,
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
  const { name, unit, priceList, priceCredit, priceTransfer, priceCash, notes } =
    await req.json();

  if (!name?.trim()) {
    return NextResponse.json(
      { error: "El nombre es requerido", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const product = await prisma.product.create({
    data: {
      tenantId,
      name: name.trim(),
      unit: unit?.trim() || null,
      priceList: priceList || null,
      priceCredit: priceCredit || null,
      priceTransfer: priceTransfer || null,
      priceCash: priceCash || null,
      notes: notes?.trim() || null,
    },
  });

  return NextResponse.json(serialise(product), { status: 201 });
});
