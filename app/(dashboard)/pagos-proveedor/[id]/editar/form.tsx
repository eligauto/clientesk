"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormField } from "@/components/form-field";
import { FormError } from "@/components/form-error";
import { BackLink } from "@/components/back-link";
import { inputClass } from "@/lib/ui";

interface Pago {
  id: string;
  supplierId: string;
  amount: number;
  method: string;
  date: string;
  notes: string;
}

export function EditarPagoProveedorForm({ pago }: { pago: Pago }) {
  const router = useRouter();

  const [amount, setAmount] = useState(String(pago.amount));
  const [method, setMethod] = useState(pago.method);
  const [date, setDate] = useState(pago.date);
  const [notes, setNotes] = useState(pago.notes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError("Ingresá un monto válido");
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch(`/api/pagos-proveedor/${pago.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amt,
        method,
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
    router.push(`/proveedores/${pago.supplierId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-8">
      <div className="flex items-center gap-3">
        <BackLink
          href={`/proveedores/${pago.supplierId}`}
          label="Volver al proveedor"
        />
        <h1 className="text-lg font-semibold text-gray-900">Editar pago</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Monto" htmlFor="monto" required>
          <input
            id="monto"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0.01"
            step="any"
            required
            placeholder="0.00"
            className={inputClass}
            autoFocus
          />
        </FormField>
        <FormField label="Método" htmlFor="metodo">
          <select
            id="metodo"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className={inputClass}
          >
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="cheque">Cheque</option>
          </select>
        </FormField>
      </div>

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

      <FormField label="Descripción" htmlFor="descripcion" optional>
        <input
          id="descripcion"
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ej: Pago cuota, abono julio..."
          className={inputClass}
        />
      </FormField>

      <FormError error={error} />

      <button
        type="submit"
        disabled={loading || !amount}
        className="w-full bg-indigo-600 text-white rounded-xl py-3.5 text-sm font-medium hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-40 transition-colors"
      >
        {loading ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
