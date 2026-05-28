import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getTenantId } from "@/lib/tenant";
import {
  EstadoCuentaBtn,
  type LedgerEntry,
} from "@/components/estado-cuenta-btn";
import { CobroForm } from "@/components/cobro-form";
import { CancelEntryBtn } from "@/components/cancel-entry-btn";
import { RouteRefresher } from "@/components/route-refresher";
import { fmt, fmtDate } from "@/lib/utils";
import { DeleteClienteButton } from "./delete-cliente";

const METHOD_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  cheque: "Cheque",
};

export default async function ClienteDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const tenantId = await getTenantId();

  const [customer, transactions, cobros] = await Promise.all([
    prisma.customer.findFirst({ where: { id: params.id, tenantId } }),
    prisma.transaction.findMany({
      where: { customerId: params.id, tenantId },
      include: { product: { select: { name: true, unit: true } } as any },
      orderBy: { date: "asc" },
    }),
    prisma.accountPayment.findMany({
      where: { customerId: params.id, tenantId },
      orderBy: { date: "asc" },
    }),
  ]);

  if (!customer) notFound();

  // Saldo y stats solo sobre entradas activas
  const totalVendido = transactions
    .filter((t) => t.status === "active")
    .reduce((s, t) => s + Number(t.totalAmount), 0);
  const totalCobrado = cobros
    .filter((c) => c.status === "active")
    .reduce((s, c) => s + Number(c.amount), 0);
  const saldo = Number(customer.balanceDue);

  // Historial unificado ordenado por fecha ASC
  type HistoryEntry = {
    kind: "venta" | "cobro";
    id: string;
    date: Date;
    description: string;
    amount: number;
    status: string;
    extra?: string;
  };

  const history: HistoryEntry[] = [
    ...transactions.map((t) => ({
      kind: "venta" as const,
      id: t.id,
      date: t.date,
      description:
        (t as any).product?.name ?? (t as any).productName ?? "Venta",
      amount: Number(t.totalAmount),
      status: t.status,
      extra: `${Number(t.quantity)} ${(t as any).product?.unit ?? "u."}`,
    })),
    ...cobros.map((c) => ({
      kind: "cobro" as const,
      id: c.id,
      date: c.date,
      description: c.notes ?? "Cobro",
      amount: Number(c.amount),
      status: c.status,
      extra: METHOD_LABEL[c.method] ?? c.method,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Entradas para el estado de cuenta
  const ledgerEntries: LedgerEntry[] = history.map((h) => ({
    kind: h.kind,
    id: h.id,
    date: h.date,
    description: h.description,
    amount: h.amount,
    status: h.status,
  }));

  return (
    <div>
      <RouteRefresher />
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/clientes" className="text-xs text-gray-400 mb-1 block">
            ← Clientes
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">
            {customer.name}
          </h1>
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
            className={`text-sm font-semibold ${saldo > 0 ? "text-amber-600" : "text-green-600"}`}
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
        <CobroForm customerId={customer.id} />
        <EstadoCuentaBtn
          customerName={customer.name}
          entries={ledgerEntries}
          totalVendido={totalVendido}
          totalCobrado={totalCobrado}
          saldo={saldo}
        />
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
              entry.kind === "venta"
                ? `/transacciones/${entry.id}/editar`
                : `/cobros/${entry.id}/editar`;
            const cancelEndpoint =
              entry.kind === "venta"
                ? `/api/transacciones/${entry.id}/cancelar`
                : `/api/cobros/${entry.id}/cancelar`;

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
                          entry.kind === "venta"
                            ? "bg-indigo-50 text-indigo-600"
                            : "bg-green-50 text-green-700"
                        }`}
                      >
                        {entry.kind === "venta" ? "Venta" : "Cobro"}
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
                        entry.kind === "venta"
                          ? "text-gray-900"
                          : "text-green-700"
                      }`}
                    >
                      {entry.kind === "cobro" ? "+" : ""}
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

      {/* Danger zone */}
      <div className="mt-8 pt-6 border-t border-gray-100">
        <DeleteClienteButton
          clienteId={customer.id}
          clienteName={customer.name}
          transactionCount={transactions.length}
          balanceDue={saldo}
        />
      </div>
    </div>
  );
}
