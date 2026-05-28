"use client";

import { useState } from "react";
import { FormField } from "@/components/form-field";
import { FormError } from "@/components/form-error";
import { BackLink } from "@/components/back-link";
import { Combobox } from "@/components/combobox";
import { fmt } from "@/lib/utils";
import { inputClass } from "@/lib/ui";
import { crearTransaccion } from "./actions";

type Customer = { id: string; name: string };

const PRICE_LABELS: Record<string, string> = {
  lista: "Lista",
  credito: "Crédito",
  transferencia: "Transferencia",
  contado: "Contado",
};

export function NuevaVentaForm({
  customers,
  defaultClienteId,
}: {
  customers: Customer[];
  defaultClienteId?: string;
}) {
  const today = new Date().toISOString().split("T")[0];

  const [clienteId, setClienteId] = useState(defaultClienteId ?? "");
  const [productoName, setProductoName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [priceType, setPriceType] = useState("lista");
  const [unitPrice, setUnitPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const qty = parseFloat(quantity) || 0;
  const price = parseFloat(unitPrice) || 0;
  const total = qty * price;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteId || !productoName.trim()) {
      setError("Seleccioná un cliente e ingresá el producto");
      return;
    }
    setLoading(true);
    setError("");

    const result = await crearTransaccion({
      customerId: clienteId,
      productName: productoName.trim(),
      quantity: qty,
      priceType,
      unitPrice: price,
      notes: notes || undefined,
      date,
    });

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-8">
      <div className="flex items-center gap-3">
        <BackLink
          href={clienteId ? `/clientes/${clienteId}` : "/clientes"}
          label="Volver"
        />
        <h1 className="text-lg font-semibold text-gray-900">Nueva venta</h1>
      </div>

      <FormField label="Cliente" htmlFor="cliente" required>
        <Combobox
          options={customers.map((c) => ({ id: c.id, label: c.name }))}
          value={clienteId}
          onChange={setClienteId}
          placeholder="Buscar cliente..."
          required
        />
      </FormField>

      <FormField label="Producto" htmlFor="producto" required>
        <input
          id="producto"
          type="text"
          value={productoName}
          onChange={(e) => setProductoName(e.target.value)}
          placeholder='Ej: Llave inglesa 12"'
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
          <span className="text-sm text-gray-600">Total a cargar</span>
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
        disabled={
          loading ||
          !clienteId ||
          !productoName.trim() ||
          !unitPrice ||
          qty <= 0
        }
        className="w-full bg-indigo-600 text-white rounded-xl py-3.5 text-sm font-medium hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-40 transition-colors"
      >
        {loading ? "Registrando..." : "Registrar venta"}
      </button>
    </form>
  );
}
