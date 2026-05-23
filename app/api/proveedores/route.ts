import { NextResponse } from "next/server";
import { withTenant } from "@/lib/api";
import { prisma } from "@/lib/db";

export const GET = withTenant(async (req, tenantId) => {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";

  const suppliers = await prisma.supplier.findMany({
    where: {
      tenantId,
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { balanceDue: "desc" },
    select: {
      id: true,
      name: true,
      phoneWhatsapp: true,
      balanceDue: true,
      createdAt: true,
      _count: { select: { purchases: true } },
    },
  });

  return NextResponse.json(
    suppliers.map((s) => ({ ...s, balanceDue: Number(s.balanceDue) })),
  );
});

export const POST = withTenant(async (req, tenantId) => {
  const { name, phoneWhatsapp, notes } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json(
      { error: "El nombre es requerido", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const supplier = await prisma.supplier.create({
    data: {
      tenantId,
      name: name.trim(),
      phoneWhatsapp: phoneWhatsapp?.trim() || null,
      notes: notes?.trim() || null,
    },
  });

  return NextResponse.json(
    { ...supplier, balanceDue: Number(supplier.balanceDue) },
    { status: 201 },
  );
});
