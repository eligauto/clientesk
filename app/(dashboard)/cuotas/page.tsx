import Link from "next/link";
import { prisma } from "@/lib/db";
import { getTenantId } from "@/lib/tenant";
import { fmt } from "@/lib/utils";

export default async function CuotasPage() {
  const tenantId = await getTenantId();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const installments = await prisma.paymentPlanInstallment.findMany({
    where: {
      tenantId,
      status: "pending",
      dueDate: { lt: today },
      plan: { status: "active" },
    },
    include: {
      customer: { select: { id: true, name: true } },
      plan: { select: { id: true, description: true, installmentCount: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  const totalMonto = installments.reduce(
    (s, i) => s + Number(i.expectedAmount),
    0,
  );

  const conVencidas = new Set(installments.map((i) => i.customerId)).size;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-900">Cuotas vencidas</h1>
      </div>

      {installments.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-3xl mb-3">✓</p>
          <p className="text-gray-500 font-medium">Todo al día</p>
          <p className="text-sm text-gray-400 mt-1">No hay cuotas vencidas</p>
          <Link
            href="/clientes"
            className="inline-block mt-4 text-sm text-indigo-600 font-medium"
          >
            ← Volver a clientes
          </Link>
        </div>
      ) : (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <p className="text-xs text-red-400">Total vencido</p>
              <p className="text-xl font-semibold text-red-700 mt-1">
                {fmt(totalMonto)}
              </p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-xs text-gray-400">Cuotas / clientes</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">
                {installments.length} / {conVencidas}
              </p>
            </div>
          </div>

          {/* Lista */}
          <ul className="space-y-2">
            {installments.map((inst) => {
              const due = new Date(inst.dueDate);
              due.setHours(0, 0, 0, 0);
              const daysOverdue = Math.floor(
                (today.getTime() - due.getTime()) / 86400000,
              );
              const dateStr = due.toLocaleDateString("es-AR", {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
              });

              return (
                <li key={inst.id}>
                  <Link
                    href={`/clientes/${inst.customerId}`}
                    className="flex items-center justify-between bg-white rounded-xl p-4 border border-gray-100 hover:border-red-200 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {inst.customer.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {inst.plan.description} · cuota {inst.installmentNumber}
                        /{inst.plan.installmentCount}
                      </p>
                      <p className="text-xs text-red-500 mt-0.5">
                        Vence {dateStr} · hace {daysOverdue}d
                      </p>
                    </div>
                    <div className="ml-3 flex-shrink-0 text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {fmt(Number(inst.expectedAmount))}
                      </p>
                      <span className="inline-block mt-1 text-xs bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded-full">
                        {daysOverdue}d
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
