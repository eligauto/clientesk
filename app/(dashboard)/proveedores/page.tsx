import Link from "next/link";
import { prisma } from "@/lib/db";
import { getTenantId } from "@/lib/tenant";
import { SaldoBadge } from "@/components/saldo-badge";
import { SearchInput } from "@/components/search-input";
import { Suspense } from "react";

export default async function ProveedoresPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const tenantId = await getTenantId();
  const q = searchParams.q ?? "";

  const suppliers = await prisma.supplier.findMany({
    where: {
      tenantId,
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { balanceDue: "desc" },
    include: { _count: { select: { purchases: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-900">Proveedores</h1>
        <Link
          href="/proveedores/nuevo"
          className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          + Nuevo
        </Link>
      </div>

      <div className="mb-4">
        <Suspense>
          <SearchInput placeholder="Buscar proveedor..." defaultValue={q} />
        </Suspense>
      </div>

      {suppliers.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-sm">
            {q ? `Sin resultados para "${q}"` : "Todavía no hay proveedores"}
          </p>
          {!q && (
            <Link
              href="/proveedores/nuevo"
              className="inline-block mt-3 text-sm text-indigo-600 font-medium"
            >
              Crear el primero →
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {suppliers.map((s) => (
            <li key={s.id}>
              <Link
                href={`/proveedores/${s.id}`}
                className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-indigo-200 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {s._count.purchases}{" "}
                    {s._count.purchases === 1 ? "compra" : "compras"}
                    {s.phoneWhatsapp ? ` · ${s.phoneWhatsapp}` : ""}
                  </p>
                </div>
                <SaldoBadge amount={Number(s.balanceDue)} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
