import { NextResponse } from "next/server";
import { getAuth, UNAUTHORIZED, NOT_FOUND } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await getAuth();
  if (!auth) return UNAUTHORIZED;

  const p = await prisma.product.findFirst({
    where: { id: params.id, tenantId: auth.tenantId },
    select: {
      id: true,
      name: true,
      sku: true,
      unit: true,
      priceList: true,
      priceCredit: true,
      priceTransfer: true,
      priceCash: true,
    },
  });

  if (!p) return NOT_FOUND;

  return NextResponse.json({
    id: p.id,
    name: p.name,
    sku: p.sku,
    unit: p.unit,
    priceList:     p.priceList     ? Number(p.priceList)     : null,
    priceCredit:   p.priceCredit   ? Number(p.priceCredit)   : null,
    priceTransfer: p.priceTransfer ? Number(p.priceTransfer) : null,
    priceCash:     p.priceCash     ? Number(p.priceCash)     : null,
  });
}
