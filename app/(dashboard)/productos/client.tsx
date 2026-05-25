"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fmt } from "@/lib/utils";

type Product = {
  id: string;
  sku: string | null;
  name: string;
  unit: string | null;
  costPrice: number | null;
  priceList: number | null;
  priceCredit: number | null;
  priceTransfer: number | null;
  priceCash: number | null;
  notes: string | null;
};

const MULT = {
  priceList: 1.8,
  priceCredit: 2.07,
  priceTransfer: 1.7,
  priceCash: 1.62,
};
function round2(n: number) {
  return Math.round(n * 100) / 100;
}
function calcFromCost(
  cost: number | null,
): Pick<Product, "priceList" | "priceCredit" | "priceTransfer" | "priceCash"> {
  if (!cost || cost <= 0)
    return {
      priceList: null,
      priceCredit: null,
      priceTransfer: null,
      priceCash: null,
    };
  return {
    priceList: round2(cost * MULT.priceList),
    priceCredit: round2(cost * MULT.priceCredit),
    priceTransfer: round2(cost * MULT.priceTransfer),
    priceCash: round2(cost * MULT.priceCash),
  };
}

const emptyForm = (): Omit<Product, "id"> => ({
  sku: null,
  name: "",
  unit: "",
  costPrice: null,
  priceList: null,
  priceCredit: null,
  priceTransfer: null,
  priceCash: null,
  notes: null,
});

const inputClass =
  "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

function ProductForm({
  initial,
  onSave,
  onCancel,
  loading,
  error,
}: {
  initial: Omit<Product, "id">;
  onSave: (data: Omit<Product, "id">) => void;
  onCancel: () => void;
  loading: boolean;
  error: string;
}) {
  const [form, setForm] = useState(initial);

  function set(key: keyof typeof form, value: string | number | null) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setCost(raw: string) {
    const cost = raw ? Number(raw) : null;
    setForm((f) => ({ ...f, costPrice: cost, ...calcFromCost(cost) }));
  }

  function priceInput(
    label: string,
    key: "priceList" | "priceCredit" | "priceTransfer" | "priceCash",
    mult: number,
  ) {
    const isCalc =
      form.costPrice != null && form[key] === round2(form.costPrice * mult);
    return (
      <div>
        <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
          {label}
          {isCalc && <span className="text-indigo-400 font-mono">×{mult}</span>}
        </label>
        <input
          type="number"
          value={(form[key] as number | null) ?? ""}
          onChange={(e) =>
            set(key, e.target.value ? Number(e.target.value) : null)
          }
          min="0"
          step="any"
          placeholder="—"
          className={`${inputClass} ${isCalc ? "bg-indigo-50" : ""}`}
        />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            required
            autoFocus
            placeholder="Llave inglesa"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Código
          </label>
          <input
            type="text"
            value={form.sku ?? ""}
            onChange={(e) => set("sku", e.target.value || null)}
            placeholder="AA1"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Marca
          </label>
          <input
            type="text"
            value={form.notes ?? ""}
            onChange={(e) => set("notes", e.target.value || null)}
            placeholder="ALNAT"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Unidad
          </label>
          <input
            type="text"
            value={form.unit ?? ""}
            onChange={(e) => set("unit", e.target.value)}
            placeholder="unidad / caja / kg"
            className={inputClass}
          />
        </div>

        {/* Precio de costo — dispara el auto-cálculo */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Precio de costo
          </label>
          <input
            type="number"
            value={form.costPrice ?? ""}
            onChange={(e) => setCost(e.target.value)}
            min="0"
            step="any"
            placeholder="Precio base"
            className={`${inputClass} font-medium`}
          />
        </div>

        <div className="col-span-2">
          <p className="text-xs text-gray-400 -mt-1">
            Al ingresar el costo se calculan los precios automáticamente. Podés
            editarlos.
          </p>
        </div>

        {priceInput("Lista", "priceList", MULT.priceList)}
        {priceInput("Crédito", "priceCredit", MULT.priceCredit)}
        {priceInput("Transf.", "priceTransfer", MULT.priceTransfer)}
        {priceInput("Contado", "priceCash", MULT.priceCash)}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => onSave(form)}
          disabled={loading || !form.name.trim()}
          className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          {loading ? "Guardando..." : "Guardar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function ProductosClient({
  initialProducts,
  page,
  totalPages,
  total,
  query,
}: {
  initialProducts: Product[];
  page: number;
  totalPages: number;
  total: number;
  query: string;
}) {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [search, setSearch] = useState(query);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (search === query) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      router.push(`/productos?${params.toString()}`);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleCreate(data: Omit<Product, "id">) {
    setSaving(true);
    setSaveError("");
    const res = await fetch("/api/productos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const d = await res.json();
      setSaveError(d.error ?? "Error al crear");
      setSaving(false);
      return;
    }
    setShowNew(false);
    setSaving(false);
    router.refresh();
  }

  async function handleEdit(id: string, data: Omit<Product, "id">) {
    setSaving(true);
    setSaveError("");
    const res = await fetch(`/api/productos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const d = await res.json();
      setSaveError(d.error ?? "Error al guardar");
      setSaving(false);
      return;
    }
    setEditingId(null);
    setSaving(false);
    router.refresh();
  }

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    params.set("page", String(p));
    return `/productos?${params.toString()}`;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-lg font-semibold text-gray-900 min-w-0">
          Productos
          {total > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({total.toLocaleString("es-AR")})
            </span>
          )}
        </h1>
        {!showNew && (
          <div className="flex gap-2 shrink-0">
            <Link
              href="/productos/importar"
              className="text-sm font-medium px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Importar
            </Link>
            <button
              onClick={() => {
                setShowNew(true);
                setEditingId(null);
              }}
              className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg"
            >
              + Nuevo
            </button>
          </div>
        )}
      </div>

      {/* Búsqueda */}
      <div className="mb-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, código o marca..."
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        />
      </div>

      {showNew && (
        <div className="mb-4">
          <ProductForm
            initial={emptyForm()}
            onSave={handleCreate}
            onCancel={() => {
              setShowNew(false);
              setSaveError("");
            }}
            loading={saving}
            error={saveError}
          />
        </div>
      )}

      {initialProducts.length === 0 && !showNew ? (
        <p className="text-sm text-gray-400 text-center py-12">
          {query
            ? "Sin resultados para esa búsqueda"
            : "Todavía no hay productos"}
        </p>
      ) : (
        <ul className="space-y-2">
          {initialProducts.map((p) => (
            <li key={p.id}>
              {editingId === p.id ? (
                <ProductForm
                  initial={{
                    sku: p.sku,
                    name: p.name,
                    unit: p.unit,
                    costPrice: p.costPrice,
                    priceList: p.priceList,
                    priceCredit: p.priceCredit,
                    priceTransfer: p.priceTransfer,
                    priceCash: p.priceCash,
                    notes: p.notes,
                  }}
                  onSave={(data) => handleEdit(p.id, data)}
                  onCancel={() => {
                    setEditingId(null);
                    setSaveError("");
                  }}
                  loading={saving}
                  error={saveError}
                />
              ) : (
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {p.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {[p.sku, p.notes, p.unit].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingId(p.id);
                        setShowNew(false);
                        setSaveError("");
                      }}
                      className="text-xs text-indigo-600 shrink-0"
                    >
                      Editar
                    </button>
                  </div>
                  <div
                    className={`grid gap-x-2 gap-y-1 mt-3 ${p.costPrice != null ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-4"}`}
                  >
                    {p.costPrice != null && (
                      <div className="text-center">
                        <p className="text-xs text-gray-400">Costo</p>
                        <p className="text-xs font-medium text-gray-500">
                          {fmt(p.costPrice)}
                        </p>
                      </div>
                    )}
                    {[
                      { label: "Lista", val: p.priceList },
                      { label: "Crédito", val: p.priceCredit },
                      { label: "Transf.", val: p.priceTransfer },
                      { label: "Contado", val: p.priceCash },
                    ].map(({ label, val }) => (
                      <div key={label} className="text-center">
                        <p className="text-xs text-gray-400">{label}</p>
                        <p className="text-xs font-medium text-gray-700">
                          {val !== null ? fmt(val) : "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
          <Link
            href={pageHref(page - 1)}
            aria-disabled={page <= 1}
            className={`text-sm px-4 py-2 rounded-lg border ${
              page <= 1
                ? "border-gray-100 text-gray-300 pointer-events-none"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            ← Anterior
          </Link>
          <span className="text-xs text-gray-500">
            {page} / {totalPages}
          </span>
          <Link
            href={pageHref(page + 1)}
            aria-disabled={page >= totalPages}
            className={`text-sm px-4 py-2 rounded-lg border ${
              page >= totalPages
                ? "border-gray-100 text-gray-300 pointer-events-none"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            Siguiente →
          </Link>
        </div>
      )}
    </div>
  );
}
