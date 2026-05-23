import { NextResponse } from "next/server";
import { getAuth, UNAUTHORIZED, NOT_FOUND } from "@/lib/api";
import { prisma } from "@/lib/db";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await getAuth();
  if (!auth) return UNAUTHORIZED;

  const customer = await prisma.customer.findFirst({
    where: { id: params.id, tenantId: auth.tenantId },
  });
  if (!customer) return NOT_FOUND;

  return NextResponse.json({
    ...customer,
    balanceDue: Number(customer.balanceDue),
  });
}

export async function PUT(req: Request, { params }: Ctx) {
  const auth = await getAuth();
  if (!auth) return UNAUTHORIZED;

  const { name, phoneWhatsapp, address, notes } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json(
      { error: "El nombre es requerido", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const result = await prisma.customer.updateMany({
    where: { id: params.id, tenantId: auth.tenantId },
    data: {
      name: name.trim(),
      phoneWhatsapp: phoneWhatsapp?.trim() || null,
      address: address?.trim() || null,
      notes: notes?.trim() || null,
    },
  });

  if (result.count === 0) return NOT_FOUND;

  const updated = await prisma.customer.findFirst({
    where: { id: params.id, tenantId: auth.tenantId },
  });
  return NextResponse.json({
    ...updated,
    balanceDue: Number(updated!.balanceDue),
  });
}
