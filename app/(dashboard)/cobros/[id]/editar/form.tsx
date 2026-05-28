"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormField } from "@/components/form-field";
import { FormError } from "@/components/form-error";
import { BackLink } from "@/components/back-link";
import { inputClass } from "@/lib/ui";

interface Cobro {
  id: string;
  customerId: string;
  amount: number;
  method: string;
  date: string;
  notes: string;
}

export function EditarCobroForm({ cobro }: { cobro: Cobro }) {
  const router = useRouter();

  const [amount, setAmount] = useState(String(cobro.amount));
  const [method, setMethod] = useState(cobro.method);
  const [date, setDate] = useState(cobro.date);
  const [notes, setNotes] = useState(cobro.notes);
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

    const res = await fetch(`/api/cobros/${cobro.id}`, {
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
    router.push(`/clientes/${cobro.customerId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-8">
      <div className="flex items-center gap-3">
        <BackLink
          href={`/clientes/${cobro.customerId}`}
          label="Volver al cliente"
        />
        <h1 className="text-lg font-semibold text-gray-900">Editar cobro</h1>
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
          placeholder="Ej: Abono julio, pago cuota..."
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
