import { NextResponse } from "next/server";
import { withTenant } from "@/lib/api";
import { prisma } from "@/lib/db";

export const GET = withTenant(async (req, tenantId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const installments = await prisma.paymentPlanInstallment.findMany({
    where: {
      tenantId,
      status: "pending",
      dueDate: { lt: today },
      plan: { status: "active" },
    },
    include: {
      customer: { select: { id: true, name: true, phoneWhatsapp: true } },
      plan: { select: { id: true, description: true, installmentCount: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  const today2 = new Date();
  today2.setHours(0, 0, 0, 0);

  const data = installments.map((i) => {
    const due = new Date(i.dueDate);
    due.setHours(0, 0, 0, 0);
    const daysOverdue = Math.floor(
      (today2.getTime() - due.getTime()) / 86400000,
    );
    return {
      id: i.id,
      planId: i.planId,
      customerId: i.customerId,
      customerName: i.customer.name,
      customerPhone: i.customer.phoneWhatsapp,
      planDescription: i.plan.description,
      installmentTotal: i.plan.installmentCount,
      installmentNumber: i.installmentNumber,
      dueDate: i.dueDate,
      expectedAmount: Number(i.expectedAmount),
      daysOverdue,
    };
  });

  const totalAmount = data.reduce((s, i) => s + i.expectedAmount, 0);

  return NextResponse.json({
    installments: data,
    totalAmount,
    count: data.length,
  });
});
