import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getTenantId } from "@/lib/tenant";
import { StatusBadge } from "@/components/saldo-badge";
import { PagoCompraForm } from "@/components/pago-compra-form";
import { fmt, fmtDate } from "@/lib/utils";
import { DeletePurchasePaymentButton } from "./delete-payment";

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

export default async function CompraDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const tenantId = await getTenantId();

  const purchase = await prisma.purchase.findFirst({
    where: { id: params.id, tenantId },
    include: {
      supplier: { select: { id: true, name: true } },
      product: { select: { name: true, unit: true } },
      purchasePayments: { orderBy: { paidAt: "asc" } },
    },
  });

  if (!purchase) notFound();

  const totalAmount = Number(purchase.totalAmount);
  const amountPaid = Number(purchase.amountPaid);
  const balanceDue = Number(purchase.balanceDue);
  const commissionPct = Number(purchase.commissionPct);

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div>
        <Link
          href={`/proveedores/${purchase.supplier.id}`}
          className="text-xs text-gray-400 mb-1 block"
        >
          ← {purchase.supplier.name}
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {purchase.product.name}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {fmtDate(purchase.date)} ·{" "}
              {Number(purchase.quantity)} {purchase.product.unit ?? "u."} ·{" "}
              {PRICE_LABEL[purchase.priceType]}
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
            {fmt(Number(purchase.unitPrice))}
          </span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-sm text-gray-600">Total</span>
          <span className="text-sm font-semibold">{fmt(totalAmount)}</span>
        </div>
        {commissionPct > 0 && (
          <div className="flex justify-between px-4 py-3">
            <span className="text-sm text-gray-600">Cueva</span>
            <span className="text-sm text-gray-500">{commissionPct}%</span>
          </div>
        )}
        <div className="flex justify-between px-4 py-3">
          <span className="text-sm text-gray-600">Pagado</span>
          <span className="text-sm font-medium text-green-700">{fmt(amountPaid)}</span>
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
      {purchase.notes && (
        <p className="text-sm text-gray-500 px-1">{purchase.notes}</p>
      )}

      {/* Payment history */}
      {purchase.purchasePayments.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-700 mb-2">Pagos</h2>
          <ul className="space-y-2">
            {purchase.purchasePayments.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-100"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {fmt(Number(p.amount))}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {METHOD_LABEL[p.method]} · {fmtDate(p.paidAt)}
                  </p>
                </div>
                <DeletePurchasePaymentButton paymentId={p.id} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Add payment */}
      {balanceDue > 0 && (
        <PagoCompraForm purchaseId={purchase.id} maxAmount={balanceDue} />
      )}
    </div>
  );
}
