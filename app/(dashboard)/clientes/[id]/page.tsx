import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getTenantId } from "@/lib/tenant";
import {
  EstadoCuentaBtn,
  type LedgerEntry,
} from "@/components/estado-cuenta-btn";
import { MovimientoForm } from "@/components/movimiento-form";
import { fmt } from "@/lib/utils";
import { DeleteClienteButton } from "./delete-cliente";
import { HistorialCliente, type HistorialEntry } from "./historial";
import { CuotasSection } from "./cuotas-section";

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

  const [customer, transactions, cobros, planes] = await Promise.all([
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
    prisma.paymentPlan.findMany({
      where: { customerId: params.id, tenantId },
      include: { installments: { orderBy: { installmentNumber: "asc" } } },
      orderBy: { createdAt: "desc" },
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

  // Entradas para el historial colapsable (fecha serializada a ISO)
  const historialEntries: HistorialEntry[] = history.map((h) => ({
    kind: h.kind,
    id: h.id,
    date: h.date.toISOString(),
    description: h.description,
    amount: h.amount,
    status: h.status,
    extra: h.extra,
  }));

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link
            href="/clientes"
            className="inline-flex items-center gap-1 text-sm text-indigo-600 font-medium mb-1 -ml-0.5 py-0.5 pr-1"
          >
            <span className="text-base leading-none">‹</span>
            Clientes
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
        <MovimientoForm customerId={customer.id} />
        <EstadoCuentaBtn
          customerName={customer.name}
          entries={ledgerEntries}
          totalVendido={totalVendido}
          totalCobrado={totalCobrado}
          saldo={saldo}
        />
      </div>

      {/* Cuotas */}
      <div className="mb-6">
        <CuotasSection
          customerId={customer.id}
          plans={planes.map((p) => ({
            id: p.id,
            description: p.description,
            totalAmount: Number(p.totalAmount),
            installmentCount: p.installmentCount,
            frequency: p.frequency,
            status: p.status,
            installments: p.installments.map((i) => ({
              id: i.id,
              installmentNumber: i.installmentNumber,
              dueDate: i.dueDate.toISOString(),
              expectedAmount: Number(i.expectedAmount),
              status: i.status,
            })),
          }))}
        />
      </div>

      {/* Historial unificado */}
      <h2 className="text-sm font-medium text-gray-700 mb-3">
        Historial ({history.length})
      </h2>

      <HistorialCliente entries={historialEntries} />

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
