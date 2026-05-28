import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getTenantId } from "@/lib/tenant";
import { CancelEntryBtn } from "@/components/cancel-entry-btn";
import { fmt, fmtDate } from "@/lib/utils";

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
    },
  });

  if (!purchase) notFound();

  const cancelled = purchase.status === "cancelled";
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
              {fmtDate(purchase.date)} · {Number(purchase.quantity)}{" "}
              {purchase.product.unit ?? "u."} ·{" "}
              {PRICE_LABEL[purchase.priceType]}
            </p>
          </div>
          {cancelled && (
            <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-1 rounded-lg">
              Anulada
            </span>
          )}
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
          <span className="text-sm text-gray-600">Cantidad</span>
          <span className="text-sm font-medium">
            {Number(purchase.quantity)} {purchase.product.unit ?? "u."}
          </span>
        </div>
        {commissionPct > 0 && (
          <div className="flex justify-between px-4 py-3">
            <span className="text-sm text-gray-600">Cueva</span>
            <span className="text-sm text-gray-500">{commissionPct}%</span>
          </div>
        )}
        <div className="flex justify-between px-4 py-3 bg-gray-50 rounded-b-xl">
          <span className="text-sm font-medium text-gray-700">Total</span>
          <span className="text-base font-semibold text-gray-900">
            {fmt(Number(purchase.totalAmount))}
          </span>
        </div>
      </div>

      {/* Notes */}
      {purchase.notes && (
        <p className="text-sm text-gray-500 px-1">{purchase.notes}</p>
      )}

      {/* Actions */}
      {!cancelled && (
        <div className="flex gap-3 pt-2">
          <Link
            href={`/compras/${purchase.id}/editar`}
            className="flex-1 flex items-center justify-center border border-indigo-200 text-indigo-600 text-sm font-medium py-3 rounded-xl hover:bg-indigo-50 transition-colors"
          >
            Editar compra
          </Link>
          <div className="flex items-center justify-center border border-red-100 rounded-xl px-4">
            <CancelEntryBtn
              endpoint={`/api/compras/${purchase.id}/cancelar`}
              label="Anular"
            />
          </div>
        </div>
      )}
    </div>
  );
}
