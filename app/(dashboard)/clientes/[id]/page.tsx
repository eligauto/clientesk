import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getTenantId } from "@/lib/tenant";
import { SaldoBadge, StatusBadge } from "@/components/saldo-badge";
import { EstadoCuentaBtn } from "@/components/estado-cuenta-btn";
import { fmt, fmtDate } from "@/lib/utils";

export default async function ClienteDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const tenantId = await getTenantId();

  const [customer, transactions, stats] = await Promise.all([
    prisma.customer.findFirst({ where: { id: params.id, tenantId } }),
    prisma.transaction.findMany({
      where: { customerId: params.id, tenantId },
      include: {
        product: { select: { name: true, unit: true } },
        _count: { select: { payments: true } },
      },
      orderBy: { date: "desc" },
    }),
    prisma.transaction.aggregate({
      where: { customerId: params.id, tenantId },
      _sum: { totalAmount: true, amountPaid: true },
    }),
  ]);

  if (!customer) notFound();

  const totalVendido = Number(stats._sum.totalAmount ?? 0);
  const totalCobrado = Number(stats._sum.amountPaid ?? 0);
  const saldo = Number(customer.balanceDue);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/clientes" className="text-xs text-gray-400 mb-1 block">
            ← Clientes
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">{customer.name}</h1>
          {customer.phoneWhatsapp && (
            <a
              href={`tel:${customer.phoneWhatsapp}`}
              className="text-sm text-gray-500 mt-0.5 block"
            >
              {customer.phoneWhatsapp}
            </a>
          )}
          {customer.address && (
            <p className="text-xs text-gray-400 mt-0.5">{customer.address}</p>
          )}
        </div>
        <Link
          href={`/clientes/${customer.id}/editar`}
          className="text-sm text-indigo-600 font-medium"
        >
          Editar
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
          <p className="text-xs text-gray-400 mb-1">Vendido</p>
          <p className="text-sm font-semibold text-gray-900">
            {fmt(totalVendido)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
          <p className="text-xs text-gray-400 mb-1">Cobrado</p>
          <p className="text-sm font-semibold text-gray-900">
            {fmt(totalCobrado)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
          <p className="text-xs text-gray-400 mb-1">Debe</p>
          <p
            className={`text-sm font-semibold ${
              saldo > 0 ? "text-amber-600" : "text-green-600"
            }`}
          >
            {fmt(saldo)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2 mb-6">
        <Link
          href={`/transacciones/nueva?clienteId=${customer.id}`}
          className="flex items-center justify-center w-full bg-indigo-600 text-white text-sm font-medium py-3 rounded-xl"
        >
          + Nueva venta
        </Link>
        <EstadoCuentaBtn
          customerName={customer.name}
          transactions={transactions.map((t) => ({
            id: t.id,
            date: t.date instanceof Date ? t.date.toISOString() : String(t.date),
            product: t.product,
            quantity: Number(t.quantity),
            unitPrice: Number(t.unitPrice),
            totalAmount: Number(t.totalAmount),
            amountPaid: Number(t.amountPaid),
            balanceDue: Number(t.balanceDue),
          }))}
          totalVendido={totalVendido}
          totalCobrado={totalCobrado}
          saldo={saldo}
        />
      </div>

      {/* Transaction history */}
      <h2 className="text-sm font-medium text-gray-700 mb-3">
        Historial ({transactions.length})
      </h2>

      {transactions.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">Sin ventas registradas</p>
      ) : (
        <ul className="space-y-2">
          {transactions.map((t) => (
            <li key={t.id}>
              <Link
                href={`/transacciones/${t.id}`}
                className="block bg-white rounded-xl p-4 border border-gray-100 hover:border-indigo-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {t.product.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {fmtDate(t.date)} · {Number(t.quantity)}{" "}
                      {t.product.unit ?? "u."}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {fmt(Number(t.totalAmount))}
                    </p>
                    <div className="mt-1">
                      <StatusBadge
                        balanceDue={Number(t.balanceDue)}
                        totalAmount={Number(t.totalAmount)}
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
