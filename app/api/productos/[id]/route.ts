import { NextResponse } from "next/server";
import { getAuth, UNAUTHORIZED, NOT_FOUND } from "@/lib/api";
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

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await getAuth();
  if (!auth) return UNAUTHORIZED;

  const { name, unit, priceList, priceCredit, priceTransfer, priceCash, notes } =
    await req.json();

  if (!name?.trim()) {
    return NextResponse.json(
      { error: "El nombre es requerido", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const result = await prisma.product.updateMany({
    where: { id: params.id, tenantId: auth.tenantId },
    data: {
      name: name.trim(),
      unit: unit?.trim() || null,
      priceList: priceList || null,
      priceCredit: priceCredit || null,
      priceTransfer: priceTransfer || null,
      priceCash: priceCash || null,
      notes: notes?.trim() || null,
    },
  });

  if (result.count === 0) return NOT_FOUND;

  const updated = await prisma.product.findFirst({ where: { id: params.id } });
  return NextResponse.json(serialise(updated!));
}
