import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getTenantId } from "@/lib/tenant";
import { SaldoBadge, StatusBadge } from "@/components/saldo-badge";
import { fmt, fmtDate } from "@/lib/utils";

export default async function ProveedorDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const tenantId = await getTenantId();

  const [supplier, purchases, stats] = await Promise.all([
    prisma.supplier.findFirst({ where: { id: params.id, tenantId } }),
    prisma.purchase.findMany({
      where: { supplierId: params.id, tenantId },
      include: {
        product: { select: { name: true, unit: true } },
        _count: { select: { purchasePayments: true } },
      },
      orderBy: { date: "desc" },
    }),
    prisma.purchase.aggregate({
      where: { supplierId: params.id, tenantId },
      _sum: { totalAmount: true, amountPaid: true },
    }),
  ]);

  if (!supplier) notFound();

  const totalComprado = Number(stats._sum.totalAmount ?? 0);
  const totalPagado = Number(stats._sum.amountPaid ?? 0);
  const saldo = Number(supplier.balanceDue);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/proveedores" className="text-xs text-gray-400 mb-1 block">
            ← Proveedores
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">{supplier.name}</h1>
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
          <p className="text-sm font-semibold text-gray-900">{fmt(totalComprado)}</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
          <p className="text-xs text-gray-400 mb-1">Pagado</p>
          <p className="text-sm font-semibold text-gray-900">{fmt(totalPagado)}</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
          <p className="text-xs text-gray-400 mb-1">Debe</p>
          <p className={`text-sm font-semibold ${saldo > 0 ? "text-amber-600" : "text-green-600"}`}>
            {fmt(saldo)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <Link
        href={`/compras/nueva?proveedorId=${supplier.id}`}
        className="flex items-center justify-center w-full bg-indigo-600 text-white text-sm font-medium py-3 rounded-xl mb-6"
      >
        + Nueva compra
      </Link>

      {/* Purchase history */}
      <h2 className="text-sm font-medium text-gray-700 mb-3">
        Historial ({purchases.length})
      </h2>

      {purchases.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">Sin compras registradas</p>
      ) : (
        <ul className="space-y-2">
          {purchases.map((p) => (
            <li key={p.id}>
              <Link
                href={`/compras/${p.id}`}
                className="block bg-white rounded-xl p-4 border border-gray-100 hover:border-indigo-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {p.product.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {fmtDate(p.date)} · {Number(p.quantity)} {p.product.unit ?? "u."}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {fmt(Number(p.totalAmount))}
                    </p>
                    <div className="mt-1">
                      <StatusBadge
                        balanceDue={Number(p.balanceDue)}
                        totalAmount={Number(p.totalAmount)}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
