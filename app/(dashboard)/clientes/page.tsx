import Link from "next/link";
import { prisma } from "@/lib/db";
import { getTenantId } from "@/lib/tenant";
import { SaldoBadge } from "@/components/saldo-badge";
import { SearchInput } from "@/components/search-input";
import { fmt } from "@/lib/utils";
import { Suspense } from "react";
import { CuotasVencidasBadge } from "@/components/cuotas-vencidas-badge";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const tenantId = await getTenantId();
  const q = searchParams.q ?? "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [customers, deudaAgg, aFavorAgg, cuotasVencidas] = await Promise.all([
    prisma.customer.findMany({
      where: {
        tenantId,
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      },
      orderBy: { balanceDue: "desc" },
      include: { _count: { select: { transactions: true } } },
    }),
    // Deuda total: suma de saldos positivos de TODOS los clientes (no filtra por q)
    prisma.customer.aggregate({
      where: { tenantId, balanceDue: { gt: 0 } },
      _sum: { balanceDue: true },
      _count: true,
    }),
    // Saldo a favor: suma de saldos negativos (clientes con saldo a cuenta)
    prisma.customer.aggregate({
      where: { tenantId, balanceDue: { lt: 0 } },
      _sum: { balanceDue: true },
      _count: true,
    }),
    // Cuotas vencidas: count + monto total
    prisma.paymentPlanInstallment.aggregate({
      where: {
        tenantId,
        status: "pending",
        dueDate: { lt: today },
        plan: { status: "active" },
      },
      _count: true,
      _sum: { expectedAmount: true },
    }),
  ]);

  const deudaTotal = Number(deudaAgg._sum.balanceDue ?? 0);
  const deudores = deudaAgg._count;
  const aFavorTotal = -Number(aFavorAgg._sum.balanceDue ?? 0);
  const conSaldoAFavor = aFavorAgg._count;
  const cuotasVencidasCount = cuotasVencidas._count;
  const cuotasVencidasMonto = Number(cuotasVencidas._sum.expectedAmount ?? 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-900">Clientes</h1>
        <Link
          href="/clientes/nuevo"
          className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          + Nuevo
        </Link>
      </div>

      <div
        className={`mb-4 grid gap-3 ${conSaldoAFavor > 0 ? "grid-cols-2" : "grid-cols-1"}`}
      >
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-400">Deuda total</p>
          <p
            className={`text-xl font-semibold mt-1 ${
              deudaTotal > 0 ? "text-amber-600" : "text-green-600"
            }`}
          >
            {fmt(deudaTotal)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {deudores} {deudores === 1 ? "cliente debe" : "clientes deben"}
          </p>
        </div>

        {conSaldoAFavor > 0 && (
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400">A favor</p>
            <p className="text-xl font-semibold mt-1 text-sky-600">
              {fmt(aFavorTotal)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {conSaldoAFavor}{" "}
              {conSaldoAFavor === 1 ? "cliente a cuenta" : "clientes a cuenta"}
            </p>
          </div>
        )}
      </div>

      {cuotasVencidasCount > 0 && (
        <CuotasVencidasBadge
          count={cuotasVencidasCount}
          monto={cuotasVencidasMonto}
        />
      )}

      <div className="mb-4">
        <Suspense>
          <SearchInput placeholder="Buscar cliente..." defaultValue={q} />
        </Suspense>
      </div>

      {customers.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-sm">
            {q ? `Sin resultados para "${q}"` : "Todavía no hay clientes"}
          </p>
          {!q && (
            <Link
              href="/clientes/nuevo"
              className="inline-block mt-3 text-sm text-indigo-600 font-medium"
            >
              Crear el primero →
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {customers.map((c) => (
            <li key={c.id}>
              <Link
                href={`/clientes/${c.id}`}
                className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-indigo-200 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {c._count.transactions}{" "}
                    {c._count.transactions === 1 ? "venta" : "ventas"}
                    {c.phoneWhatsapp ? ` · ${c.phoneWhatsapp}` : ""}
                  </p>
                </div>
                <SaldoBadge amount={Number(c.balanceDue)} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
