import { NextResponse } from "next/server";
import { getAuth, unauthorized, notFound } from "@/lib/api";
import { prisma } from "@/lib/db";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await getAuth();
  if (!auth) return unauthorized();

  const supplier = await prisma.supplier.findFirst({
    where: { id: params.id, tenantId: auth.tenantId },
  });
  if (!supplier) return notFound();

  return NextResponse.json({
    ...supplier,
    balanceDue: Number(supplier.balanceDue),
  });
}

export async function PUT(req: Request, { params }: Ctx) {
  const auth = await getAuth();
  if (!auth) return unauthorized();

  const { name, phoneWhatsapp, notes } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json(
      { error: "El nombre es requerido", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const result = await prisma.supplier.updateMany({
    where: { id: params.id, tenantId: auth.tenantId },
    data: {
      name: name.trim(),
      phoneWhatsapp: phoneWhatsapp?.trim() || null,
      notes: notes?.trim() || null,
    },
  });

  if (result.count === 0) return notFound();

  const updated = await prisma.supplier.findFirst({
    where: { id: params.id, tenantId: auth.tenantId },
  });
  return NextResponse.json({
    ...updated,
    balanceDue: Number(updated!.balanceDue),
  });
}
