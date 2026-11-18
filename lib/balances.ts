import { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/** balance_due del cliente = sum(ventas activas) - sum(cobros activos). */
export async function recalcCustomerBalance(
  tx: Tx,
  customerId: string,
  tenantId: string,
) {
  const where = { customerId, tenantId, status: "active" as const };
  const [txSum, paySum] = await Promise.all([
    tx.transaction.aggregate({ where, _sum: { totalAmount: true } }),
    tx.accountPayment.aggregate({ where, _sum: { amount: true } }),
  ]);

  await tx.customer.update({
    where: { id: customerId },
    data: {
      balanceDue:
        Number(txSum._sum.totalAmount ?? 0) - Number(paySum._sum.amount ?? 0),
    },
  });
}

/** balance_due del proveedor = sum(compras activas) - sum(pagos activos). */
export async function recalcSupplierBalance(
  tx: Tx,
  supplierId: string,
  tenantId: string,
) {
  const where = { supplierId, tenantId, status: "active" as const };
  const [purchaseSum, paySum] = await Promise.all([
    tx.purchase.aggregate({ where, _sum: { totalAmount: true } }),
    tx.supplierPayment.aggregate({ where, _sum: { amount: true } }),
  ]);

  await tx.supplier.update({
    where: { id: supplierId },
    data: {
      balanceDue:
        Number(purchaseSum._sum.totalAmount ?? 0) -
        Number(paySum._sum.amount ?? 0),
    },
  });
}
