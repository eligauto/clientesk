"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FormField } from "@/components/form-field";
import { FormError } from "@/components/form-error";
import { BackLink } from "@/components/back-link";
import { Combobox } from "@/components/combobox";
import { fmt } from "@/lib/utils";
import { inputClass } from "@/lib/ui";

type Supplier = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  sku: string | null;
  unit: string | null;
  priceList: number | null;
  priceCredit: number | null;
  priceTransfer: number | null;
  priceCash: number | null;
};

const PRICE_LABELS: Record<string, string> = {
  lista: "Lista",
  credito: "Crédito",
  transferencia: "Transferencia",
  contado: "Contado",
};

const PRICE_FIELDS: Record<string, keyof Product> = {
  lista: "priceList",
  credito: "priceCredit",
  transferencia: "priceTransfer",
  contado: "priceCash",
};

export function NuevaCompraForm({
  suppliers,
  defaultProveedorId,
}: {
  suppliers: Supplier[];
  defaultProveedorId?: string;
}) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  const [proveedorId, setProveedorId] = useState(defaultProveedorId ?? "");
  const [productoId, setProductoId] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [priceType, setPriceType] = useState("lista");
  const [unitPrice, setUnitPrice] = useState("");
  const [commissionPct, setCommissionPct] = useState("0");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function searchProductos(q: string) {
    if (q.length < 2) return [];
    const res = await fetch(`/api/productos?q=${encodeURIComponent(q)}&page=1`);
    if (!res.ok) return [];
    const data: Product[] = await res.json();
    return data.map((p) => ({
      id: p.id,
      label: p.name,
      sub: p.sku ?? undefined,
      _product: p,
    })) as any[];
  }

  function handleProductSelect(id: string) {
    setProductoId(id);
    if (!id) {
      setSelectedProduct(null);
      setUnitPrice("");
      return;
    }
    fetch(`/api/productos/${id}/precios`)
      .then((r) => r.json())
      .then((p: Product) => {
        setSelectedProduct(p);
        const field = PRICE_FIELDS[priceType];
        const price = p[field] as number | null;
        if (price != null) setUnitPrice(String(price));
      })
      .catch(() => {});
  }

  useEffect(() => {
    if (!selectedProduct) return;
    const field = PRICE_FIELDS[priceType];
    const price = selectedProduct[field] as number | null;
    if (price != null) setUnitPrice(String(price));
  }, [priceType, selectedProduct]);

  const qty = parseFloat(quantity) || 0;
  const price = parseFloat(unitPrice) || 0;
  const total = qty * price;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!proveedorId || !productoId) {
      setError("Seleccioná un proveedor y un producto");
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch("/api/compras", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId: proveedorId,
        productId: productoId,
        quantity: qty,
        priceType,
        unitPrice: price,
        commissionPct: parseFloat(commissionPct) || 0,
        notes: notes || undefined,
        date,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al registrar la compra");
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push(`/proveedores/${proveedorId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-8">
      <div className="flex items-center gap-3">
        <BackLink
          href={proveedorId ? `/proveedores/${proveedorId}` : "/proveedores"}
          label="Volver"
        />
        <h1 className="text-lg font-semibold text-gray-900">Nueva compra</h1>
      </div>

      <FormField label="Proveedor" htmlFor="proveedor" required>
        <Combobox
          options={suppliers.map((s) => ({ id: s.id, label: s.name }))}
          value={proveedorId}
          onChange={setProveedorId}
          placeholder="Buscar proveedor..."
          required
        />
      </FormField>

      <FormField label="Producto" htmlFor="producto" required>
        <Combobox
          onSearch={searchProductos}
          value={productoId}
          onChange={handleProductSelect}
          placeholder="Escribí nombre o código..."
          required
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Cantidad" htmlFor="cantidad">
          <input
            id="cantidad"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="0.001"
            step="any"
            required
            className={inputClass}
          />
        </FormField>
        <FormField label="Tipo de precio" htmlFor="tipo-precio">
          <select
            id="tipo-precio"
            value={priceType}
            onChange={(e) => setPriceType(e.target.value)}
            className={inputClass}
          >
            {Object.entries(PRICE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label="Precio unitario" htmlFor="precio-unitario">
        <input
          id="precio-unitario"
          type="number"
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          min="0"
          step="any"
          required
          placeholder="0.00"
          className={inputClass}
        />
      </FormField>

      {total > 0 && (
        <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center">
          <span className="text-sm text-gray-600">Total a cargar</span>
          <span className="text-base font-semibold text-gray-900">
            {fmt(total)}
          </span>
        </div>
      )}

      <FormField label="Comisión cueva (%)" htmlFor="comision">
        <input
          id="comision"
          type="number"
          value={commissionPct}
          onChange={(e) => setCommissionPct(e.target.value)}
          min="0"
          max="100"
          step="0.01"
          placeholder="0"
          className={inputClass}
        />
      </FormField>

      <FormField label="Fecha" htmlFor="fecha">
        <input
          id="fecha"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className={inputClass}
        />
      </FormField>

      <FormField label="Notas" htmlFor="notas" optional>
        <textarea
          id="notas"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className={`${inputClass} resize-none`}
        />
      </FormField>

      <FormError error={error} />

      <button
        type="submit"
        disabled={
          loading || !proveedorId || !productoId || !unitPrice || qty <= 0
        }
        className="w-full bg-indigo-600 text-white rounded-xl py-3.5 text-sm font-medium hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-40 transition-colors"
      >
        {loading ? "Registrando..." : "Registrar compra"}
      </button>
    </form>
  );
}
