"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormField } from "@/components/form-field";
import { FormError } from "@/components/form-error";
import { inputClass } from "@/lib/ui";

export function CobroForm({ customerId }: { customerId: string }) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("efectivo");
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError("Ingresá un monto válido");
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch("/api/cobros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        amount: amt,
        method,
        date,
        notes: notes || undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al registrar el cobro");
      setLoading(false);
      return;
    }

    setAmount("");
    setNotes("");
    setDate(today);
    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center w-full border border-green-300 text-green-700 text-sm font-medium py-3 rounded-xl hover:bg-green-50 active:bg-green-100 transition-colors"
      >
        + Registrar cobro
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3"
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-green-800">
          Registrar cobro
        </h3>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError("");
          }}
          aria-label="Cerrar"
          className="text-gray-400 hover:text-gray-600 active:text-gray-800 transition-colors p-2 -mr-2 -mt-1"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Monto" htmlFor="cobro-amount" required>
          <input
            id="cobro-amount"
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
        <FormField label="Método" htmlFor="cobro-method">
          <select
            id="cobro-method"
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

      <FormField label="Fecha" htmlFor="cobro-date">
        <input
          id="cobro-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className={inputClass}
        />
      </FormField>

      <FormField label="Descripción" htmlFor="cobro-notes" optional>
        <input
          id="cobro-notes"
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
        className="w-full bg-green-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-green-700 active:bg-green-800 disabled:opacity-40 transition-colors"
      >
        {loading ? "Registrando..." : "Confirmar cobro"}
      </button>
    </form>
  );
}
