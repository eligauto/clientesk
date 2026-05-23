import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getTenantId } from "@/lib/tenant";
import { StatusBadge } from "@/components/saldo-badge";
import { PagoForm } from "@/components/pago-form";
import { fmt, fmtDate } from "@/lib/utils";
import { DeletePaymentButton } from "./delete-payment";

const METHOD_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  cheque: "Cheque",
};

const PRICE_LABEL: Record<string, string> = {
  lista: "Lista",
  credito: "Crédito",
  transferencia: "Transferencia",
  contado: "Contado",
};

export default async function TransaccionDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const tenantId = await getTenantId();

  const transaction = await prisma.transaction.findFirst({
    where: { id: params.id, tenantId },
    include: {
      customer: { select: { id: true, name: true } },
      product: { select: { name: true, unit: true } },
      payments: { orderBy: { paidAt: "asc" } },
    },
  });

  if (!transaction) notFound();

  const totalAmount = Number(transaction.totalAmount);
  const amountPaid = Number(transaction.amountPaid);
  const balanceDue = Number(transaction.balanceDue);

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div>
        <Link
          href={`/clientes/${transaction.customer.id}`}
          className="text-xs text-gray-400 mb-1 block"
        >
          ← {transaction.customer.name}
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {transaction.product.name}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {fmtDate(transaction.date)} ·{" "}
              {Number(transaction.quantity)} {transaction.product.unit ?? "u."} ·{" "}
              {PRICE_LABEL[transaction.priceType]}
            </p>
          </div>
          <StatusBadge balanceDue={balanceDue} totalAmount={totalAmount} />
        </div>
      </div>

      {/* Amounts */}
      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        <div className="flex justify-between px-4 py-3">
          <span className="text-sm text-gray-600">Precio unitario</span>
          <span className="text-sm font-medium">
            {fmt(Number(transaction.unitPrice))}
          </span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-sm text-gray-600">Total</span>
          <span className="text-sm font-semibold">{fmt(totalAmount)}</span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-sm text-gray-600">Cobrado</span>
          <span className="text-sm font-medium text-green-700">
            {fmt(amountPaid)}
          </span>
        </div>
        <div className="flex justify-between px-4 py-3 bg-gray-50 rounded-b-xl">
          <span className="text-sm font-medium text-gray-700">Debe</span>
          <span
            className={`text-sm font-semibold ${
              balanceDue > 0 ? "text-amber-600" : "text-green-600"
            }`}
          >
            {fmt(balanceDue)}
          </span>
        </div>
      </div>

      {/* Notes */}
      {transaction.notes && (
        <p className="text-sm text-gray-500 px-1">{transaction.notes}</p>
      )}

      {/* Payment history */}
      {transaction.payments.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-700 mb-2">Pagos</h2>
          <ul className="space-y-2">
            {transaction.payments.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-100"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {fmt(Number(p.amount))}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {METHOD_LABEL[p.method]} ·{" "}
                    {fmtDate(p.paidAt)}
                  </p>
                </div>
                <DeletePaymentButton paymentId={p.id} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Add payment */}
      {balanceDue > 0 && (
        <PagoForm transactionId={transaction.id} maxAmount={balanceDue} />
      )}
    </div>
  );
}
