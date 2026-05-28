import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getTenantId } from "@/lib/tenant";
import { PagoProveedorForm } from "@/components/pago-proveedor-form";
import { CancelEntryBtn } from "@/components/cancel-entry-btn";
import { RouteRefresher } from "@/components/route-refresher";
import { fmt, fmtDate } from "@/lib/utils";

const METHOD_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  cheque: "Cheque",
};

export default async function ProveedorDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const tenantId = await getTenantId();

  const [supplier, purchases, pagos] = await Promise.all([
    prisma.supplier.findFirst({ where: { id: params.id, tenantId } }),
    prisma.purchase.findMany({
      where: { supplierId: params.id, tenantId },
      include: { product: { select: { name: true, unit: true } } },
      orderBy: { date: "asc" },
    }),
    prisma.supplierPayment.findMany({
      where: { supplierId: params.id, tenantId },
      orderBy: { date: "asc" },
    }),
  ]);

  if (!supplier) notFound();

  const totalComprado = purchases
    .filter((p) => p.status === "active")
    .reduce((s, p) => s + Number(p.totalAmount), 0);
  const totalPagado = pagos
    .filter((p) => p.status === "active")
    .reduce((s, p) => s + Number(p.amount), 0);
  const saldo = Number(supplier.balanceDue);

  // Historial unificado ordenado por fecha ASC
  type HistoryEntry = {
    kind: "compra" | "pago";
    id: string;
    date: Date;
    description: string;
    amount: number;
    status: string;
    extra?: string;
  };

  const history: HistoryEntry[] = [
    ...purchases.map((p) => ({
      kind: "compra" as const,
      id: p.id,
      date: p.date,
      description: p.product.name,
      amount: Number(p.totalAmount),
      status: p.status,
      extra: `${Number(p.quantity)} ${p.product.unit ?? "u."}`,
    })),
    ...pagos.map((p) => ({
      kind: "pago" as const,
      id: p.id,
      date: p.date,
      description: p.notes ?? "Pago",
      amount: Number(p.amount),
      status: p.status,
      extra: METHOD_LABEL[p.method] ?? p.method,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div>
      <RouteRefresher />
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link
            href="/proveedores"
            className="text-xs text-gray-400 mb-1 block"
          >
            ← Proveedores
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">
            {supplier.name}
          </h1>
          {supplier.phoneWhatsapp && (
            <a
              href={`tel:${supplier.phoneWhatsapp}`}
              className="text-sm text-gray-500 mt-0.5 block"
            >
              {supplier.phoneWhatsapp}
            </a>
          )}
          {supplier.notes && (
            <p className="text-xs text-gray-400 mt-0.5">{supplier.notes}</p>
          )}
        </div>
        <Link
          href={`/proveedores/${supplier.id}/editar`}
          className="text-sm text-indigo-600 font-medium"
        >
          Editar
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
          <p className="text-xs text-gray-400 mb-1">Comprado</p>
          <p className="text-sm font-semibold text-gray-900">
            {fmt(totalComprado)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
          <p className="text-xs text-gray-400 mb-1">Pagado</p>
          <p className="text-sm font-semibold text-gray-900">
            {fmt(totalPagado)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
          <p className="text-xs text-gray-400 mb-1">Debe</p>
          <p
            className={`text-sm font-semibold ${saldo > 0 ? "text-amber-600" : "text-green-600"}`}
          >
            {fmt(saldo)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2 mb-6">
        <Link
          href={`/compras/nueva?proveedorId=${supplier.id}`}
          className="flex items-center justify-center w-full bg-indigo-600 text-white text-sm font-medium py-3 rounded-xl"
        >
          + Nueva compra
        </Link>
        <PagoProveedorForm supplierId={supplier.id} />
      </div>

      {/* Historial unificado */}
      <h2 className="text-sm font-medium text-gray-700 mb-3">
        Historial ({history.length})
      </h2>

      {history.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">
          Sin movimientos registrados
        </p>
      ) : (
        <ul className="space-y-2">
          {history.map((entry) => {
            const cancelled = entry.status === "cancelled";
            const editHref =
              entry.kind === "compra"
                ? `/compras/${entry.id}/editar`
                : `/pagos-proveedor/${entry.id}/editar`;
            const cancelEndpoint =
              entry.kind === "compra"
                ? `/api/compras/${entry.id}/cancelar`
                : `/api/pagos-proveedor/${entry.id}/cancelar`;

            return (
              <li
                key={`${entry.kind}-${entry.id}`}
                className={`bg-white rounded-xl p-4 border transition-colors ${
                  cancelled ? "border-gray-100 opacity-50" : "border-gray-100"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                          entry.kind === "compra"
                            ? "bg-indigo-50 text-indigo-600"
                            : "bg-green-50 text-green-700"
                        }`}
                      >
                        {entry.kind === "compra" ? "Compra" : "Pago"}
                      </span>
                      {cancelled && (
                        <span className="text-xs text-red-400 font-medium">
                          Anulado
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate mt-1">
                      {entry.description}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {fmtDate(entry.date)}
                      {entry.extra ? ` · ${entry.extra}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`text-sm font-semibold ${
                        entry.kind === "compra"
                          ? "text-gray-900"
                          : "text-green-700"
                      }`}
                    >
                      {entry.kind === "pago" ? "+" : ""}
                      {fmt(entry.amount)}
                    </p>
                    {!cancelled && (
                      <div className="flex items-center gap-2 mt-1 justify-end">
                        <Link
                          href={editHref}
                          className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
                        >
                          Editar
                        </Link>
                        <CancelEntryBtn endpoint={cancelEndpoint} />
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
