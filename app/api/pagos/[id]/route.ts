import { getAuth, UNAUTHORIZED, NOT_FOUND } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await getAuth();
  if (!auth) return UNAUTHORIZED;

  const payment = await prisma.payment.findFirst({
    where: { id: params.id, tenantId: auth.tenantId },
    include: { transaction: { select: { customerId: true } } },
  });

  if (!payment) return NOT_FOUND;

  const amt = Number(payment.amount);

  await prisma.$transaction(async (tx) => {
    await tx.payment.delete({ where: { id: params.id } });

    await tx.transaction.update({
      where: { id: payment.transactionId },
      data: {
        amountPaid: { decrement: amt },
        balanceDue: { increment: amt },
      },
    });

    const { _sum } = await tx.transaction.aggregate({
      where: {
        customerId: payment.transaction.customerId,
        tenantId: auth.tenantId,
      },
      _sum: { balanceDue: true },
    });

    await tx.customer.update({
      where: { id: payment.transaction.customerId },
      data: { balanceDue: _sum.balanceDue ?? 0 },
    });
  });

  return new Response(null, { status: 204 });
}
