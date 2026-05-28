"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormField } from "@/components/form-field";
import { FormError } from "@/components/form-error";
import { BackLink } from "@/components/back-link";
import { fmt } from "@/lib/utils";
import { inputClass } from "@/lib/ui";

const PRICE_LABELS: Record<string, string> = {
  lista: "Lista",
  credito: "Crédito",
  transferencia: "Transferencia",
  contado: "Contado",
};

interface Transaction {
  id: string;
  customerId: string;
  productName: string;
  quantity: number;
  priceType: string;
  unitPrice: number;
  date: string;
  notes: string;
}

export function EditarVentaForm({ transaction }: { transaction: Transaction }) {
  const router = useRouter();

  const [productName, setProductName] = useState(transaction.productName);
  const [quantity, setQuantity] = useState(String(transaction.quantity));
  const [priceType, setPriceType] = useState(transaction.priceType);
  const [unitPrice, setUnitPrice] = useState(String(transaction.unitPrice));
  const [date, setDate] = useState(transaction.date);
  const [notes, setNotes] = useState(transaction.notes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const qty = parseFloat(quantity) || 0;
  const price = parseFloat(unitPrice) || 0;
  const total = qty * price;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch(`/api/transacciones/${transaction.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productName: productName.trim(),
        quantity: qty,
        priceType,
        unitPrice: price,
        date,
        notes: notes || undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al guardar los cambios");
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push(`/clientes/${transaction.customerId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-8">
      <div className="flex items-center gap-3">
        <BackLink
          href={`/clientes/${transaction.customerId}`}
          label="Volver al cliente"
        />
        <h1 className="text-lg font-semibold text-gray-900">Editar venta</h1>
      </div>

      <FormField label="Producto" htmlFor="producto">
        <input
          id="producto"
          type="text"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          required
          className={inputClass}
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
          <span className="text-sm text-gray-600">Total</span>
          <span className="text-base font-semibold text-gray-900">
            {fmt(total)}
          </span>
        </div>
      )}

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
        disabled={loading || !productName.trim() || qty <= 0 || price <= 0}
        className="w-full bg-indigo-600 text-white rounded-xl py-3.5 text-sm font-medium hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-40 transition-colors"
      >
        {loading ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
