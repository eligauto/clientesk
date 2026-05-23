"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fmt } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  unit: string | null;
  priceList: number | null;
  priceCredit: number | null;
  priceTransfer: number | null;
  priceCash: number | null;
  notes: string | null;
};

const emptyForm = (): Omit<Product, "id"> => ({
  name: "",
  unit: "",
  priceList: null,
  priceCredit: null,
  priceTransfer: null,
  priceCash: null,
  notes: null,
});

const inputClass =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

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

  function priceInput(label: string, key: keyof Omit<Product, "id">) {
    return (
      <div>
        <label className="block text-xs text-gray-500 mb-1">{label}</label>
        <input
          type="number"
          value={(form[key] as number | null) ?? ""}
          onChange={(e) => set(key, e.target.value ? Number(e.target.value) : null)}
          min="0"
          step="any"
          placeholder="—"
          className={inputClass}
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
          <label className="block text-xs font-medium text-gray-600 mb-1">Unidad</label>
          <input
            type="text"
            value={form.unit ?? ""}
            onChange={(e) => set("unit", e.target.value)}
            placeholder="unidad / caja / kg"
            className={inputClass}
          />
        </div>
        {priceInput("Precio lista", "priceList")}
        {priceInput("Precio crédito", "priceCredit")}
        {priceInput("Precio transf.", "priceTransfer")}
        {priceInput("Precio contado", "priceCash")}
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
}: {
  initialProducts: Product[];
}) {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

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

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold text-gray-900">Productos</h1>
        {!showNew && (
          <button
            onClick={() => { setShowNew(true); setEditingId(null); }}
            className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            + Nuevo
          </button>
        )}
      </div>

      {showNew && (
        <div className="mb-4">
          <ProductForm
            initial={emptyForm()}
            onSave={handleCreate}
            onCancel={() => { setShowNew(false); setSaveError(""); }}
            loading={saving}
            error={saveError}
          />
        </div>
      )}

      {initialProducts.length === 0 && !showNew ? (
        <p className="text-sm text-gray-400 text-center py-12">
          Todavía no hay productos
        </p>
      ) : (
        <ul className="space-y-2">
          {initialProducts.map((p) => (
            <li key={p.id}>
              {editingId === p.id ? (
                <ProductForm
                  initial={{ name: p.name, unit: p.unit, priceList: p.priceList, priceCredit: p.priceCredit, priceTransfer: p.priceTransfer, priceCash: p.priceCash, notes: p.notes }}
                  onSave={(data) => handleEdit(p.id, data)}
                  onCancel={() => { setEditingId(null); setSaveError(""); }}
                  loading={saving}
                  error={saveError}
                />
              ) : (
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.name}</p>
                      {p.unit && (
                        <p className="text-xs text-gray-400 mt-0.5">{p.unit}</p>
                      )}
                    </div>
                    <button
                      onClick={() => { setEditingId(p.id); setShowNew(false); setSaveError(""); }}
                      className="text-xs text-indigo-600 shrink-0"
                    >
                      Editar
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1 mt-3">
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
    </div>
  );
}
