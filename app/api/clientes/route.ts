import { NextResponse } from "next/server";
import { withTenant } from "@/lib/api";
import { prisma } from "@/lib/db";

export const GET = withTenant(async (req, tenantId) => {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";

  const customers = await prisma.customer.findMany({
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
      _count: { select: { transactions: true } },
    },
  });

  return NextResponse.json(
    customers.map((c) => ({ ...c, balanceDue: Number(c.balanceDue) }))
  );
});

export const POST = withTenant(async (req, tenantId) => {
  const body = await req.json();
  const { name, phoneWhatsapp, address, notes } = body;

  if (!name?.trim()) {
    return NextResponse.json(
      { error: "El nombre es requerido", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const customer = await prisma.customer.create({
    data: {
      tenantId,
      name: name.trim(),
      phoneWhatsapp: phoneWhatsapp?.trim() || null,
      address: address?.trim() || null,
      notes: notes?.trim() || null,
    },
  });

  return NextResponse.json(
    { ...customer, balanceDue: Number(customer.balanceDue) },
    { status: 201 }
  );
});
